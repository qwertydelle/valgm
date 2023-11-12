/**
 * @name views.gameLog
 * @namespace Game log and box score viewing for all seasons and teams.
 */
define(["dao", "globals", "ui", "lib/bluebird", "lib/jquery", "lib/knockout", "views/components", "util/bbgmView", "util/helpers"], function (dao, g, ui, Promise, $, ko, components, bbgmView, helpers) {
    "use strict";

    /**
     * Generate a box score.
     *
     * @memberOf views.gameLog
     * @param {number} gid Integer game ID for the box score (a negative number means no box score).
     * @return {Promise.Object} Resolves to an object containing the box score data (or a blank object).
     */
    function boxScore(gid) {
        if (gid >= 0) {
            return dao.games.get({key: gid}).then(function (game) {
                var i;


                // If game doesn't exist (bad gid or deleted box scores), show nothing
                if (!game) {
                    return {};
                }

                for (i = 0; i < game.teams.length; i++) {
                    // Team metadata
                    game.teams[i].abbrev = g.teamAbbrevsCache[game.teams[i].tid];
                    game.teams[i].region = g.teamRegionsCache[game.teams[i].tid];
                    game.teams[i].name = g.teamNamesCache[game.teams[i].tid];

                    // Fix the total minutes calculation, which is usually fucked up for some unknown reason
                    game.teams[i].min = 240 + 25 * game.overtimes;

                    // Put injured players at the bottom, then sort by GS and roster position
                    game.teams[i].players.sort(function (a, b) {
                        // This sorts by starters first and minutes second, since .min is always far less than 1000 and gs is either 1 or 0. Then injured players are listed at the end, if they didn't play.
                        return (b.gs * 100000 + b.min * 1000 - b.injury.gamesRemaining) - (a.gs * 100000 + a.min * 1000 - a.injury.gamesRemaining);
                    });
                }

                // Team metadata
                game.won.region = g.teamRegionsCache[game.won.tid];
                game.won.name = g.teamNamesCache[game.won.tid];
                game.won.abbrev = g.teamAbbrevsCache[game.won.tid];
                game.lost.region = g.teamRegionsCache[game.lost.tid];
                game.lost.name = g.teamNamesCache[game.lost.tid];
                game.lost.abbrev = g.teamAbbrevsCache[game.lost.tid];

                if (game.overtimes === 1) {
                    game.overtime = " (OT)";
                } else if (game.overtimes > 1) {
                    game.overtime = " (" + game.overtimes + "OT)";
                } else {
                    game.overtime = "";
                }

                return game;
            });
        }

        return Promise.resolve({});
    }

    function get(req) {
        var inputs, out;

        inputs = {};

        out = helpers.validateAbbrev(req.params.abbrev);
        inputs.abbrev = out[1];
        inputs.season = helpers.validateSeason(req.params.season);
        inputs.gid = req.params.gid !== undefined ? parseInt(req.params.gid, 10) : -1;

        return inputs;
    }

    function InitViewModel() {
        this.boxScore = {
            gid: ko.observable(-1),
            prevGid: ko.observable(null),
            nextGid: ko.observable(null)
        };
        this.gamesList = {
            abbrev: ko.observable(),
            loading: ko.observable(true), // Needed because this isn't really set until updateGamesList, which could be after first render
            season: ko.observable(),
            games: ko.observableArray([])
        };

        // This computed is used so the box score won't be rendered until after it is fully loaded (due to the throttle). Otherwise, the mapping plugin sometimes sets the gid before the rest of the box score.
        // But because it's throttled, ui.tableClickableRows can't be called directly in uiFirst or uiEvery.
        this.showBoxScore = ko.computed(function () {
            return this.boxScore.gid() >= 0;
        }, this).extend({throttle: 1});
    }

/* This doesn't work for some reason.
    mapping = {
        gamesList: {
            update: function (options) {
                return new function () {
                    komapping.fromJS(options.data, {
                        games: {
                            create: function (options) {
                                return options.data;
                            }
                        }
                    }, this);
                }();
            }
        }
    };*/

    function updatePrevNextLinks(vm) {
        var games, i;

        games = vm.gamesList.games();
        vm.boxScore.prevGid(null);
        vm.boxScore.nextGid(null);

        for (i = 0; i < games.length; i++) {
            if (games[i].gid === vm.boxScore.gid()) {
                if (i > 0) {
                    vm.boxScore.nextGid(games[i - 1].gid);
                }
                if (i < games.length - 1) {
                    vm.boxScore.prevGid(games[i + 1].gid);
                }
                break;
            }
        }
    }

    function updateTeamSeason(inputs) {
        return {
            // Needed for dropdown
            abbrev: inputs.abbrev,
            season: inputs.season
        };
    }

    /**
     * Update the displayed box score, as necessary.
     *
     * If the box score is already loaded, nothing is done.
     *
     * @memberOf views.gameLog
     * @param {number} inputs.gid Integer game ID for the box score (a negative number means no box score).
     */
    function updateBoxScore(inputs, updateEvents, vm) {
        if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || inputs.gid !== vm.boxScore.gid()) {
            return boxScore(inputs.gid).then(function (game) {
                var vars;

                vars = {
                    boxScore: game
                };

                // Either update the box score if we found one, or show placeholder
                if (!game.hasOwnProperty("teams")) {
                    vars.boxScore.gid = -1;
                } else {
                    vars.boxScore.gid = inputs.gid;

                    // Force scroll to top, which otherwise wouldn't happen because this is an internal link
                    window.scrollTo(window.pageXOffset, 0);
                }

                return vars;
            });
        }
    }

    /**
     * Update the game log list, as necessary.
     *
     * If the game log list is already loaded, nothing is done. If the game log list is loaded and a new game has been played, update. If the game log list is not loaded, load it.
     *
     * @memberOf views.gameLog
     * @param {string} inputs.abbrev Abbrev of the team for the list of games.
     * @param {number} inputs.season Season for the list of games.
     * @param {number} inputs.gid Integer game ID for the box score (a negative number means no box score), which is used only for highlighting the relevant entry in the list.
     */
    function updateGamesList(inputs, updateEvents, vm) {
        if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || inputs.abbrev !== vm.gamesList.abbrev() || inputs.season !== vm.gamesList.season()) {
            // Load all games in list
            vm.gamesList.loading(true);
            vm.gamesList.games([]);
            return helpers.gameLogList(inputs.abbrev, inputs.season, inputs.gid, vm.gamesList.games()).then(function (games) {
                vm.gamesList.games(games);
                vm.gamesList.abbrev(inputs.abbrev);
                vm.gamesList.season(inputs.season);
                vm.gamesList.loading(false);

                // Update prev/next links, in case box score loaded before games list
                updatePrevNextLinks(vm);

/* This doesn't work for some reason.
                return {
                    gamesList: {
                        games: games,
                        abbrev: inputs.abbrev,
                        season: inputs.season,
                        loading: false
                    }
                };*/
            });
        }
        if (updateEvents.indexOf("gameSim") >= 0 && inputs.season === g.season) {
            // Partial update of only new games
            return helpers.gameLogList(inputs.abbrev, inputs.season, inputs.gid, vm.gamesList.games()).then(function (games) {
                var i;
                for (i = games.length - 1; i >= 0; i--) {
                    vm.gamesList.games.unshift(games[i]);
                }

                // Update prev/next links, in case box score loaded before games list
                updatePrevNextLinks(vm);
            });
        }
    }

    function uiFirst(vm) {
        ko.computed(function () {
            ui.title("Game Log - " + vm.season());
        }).extend({throttle: 1});

        // Update prev/next links whenever box score gid is changed
        ko.computed(function () {
            vm.boxScore.gid();
            updatePrevNextLinks(vm);
        }).extend({throttle: 1});
    }

    function uiEvery(updateEvents, vm) {
        components.dropdown("game-log-dropdown", ["teams", "seasons"], [vm.abbrev(), vm.season()], updateEvents, vm.boxScore.gid() >= 0 ? vm.boxScore.gid() : undefined);

        // UGLY HACK for two reasons:
        // 1. Box score might be hidden if none is loaded, so in that case there is no table to make clickable
        // 2. When box scores are shown, it might happen after uiEvery is called because vm.showBoxScore is throttled
        window.setTimeout(function () {
            var tableEls;

            tableEls = $(".box-score-team");
            if (tableEls.length > 0 && !tableEls[0].classList.contains("table-hover")) {
                ui.tableClickableRows(tableEls);
            }
        }, 100);
    }

    return bbgmView.init({
        id: "gameLog",
        get: get,
        InitViewModel: InitViewModel,
        runBefore: [updateBoxScore, updateTeamSeason],
        runWhenever: [updateGamesList],
        uiFirst: uiFirst,
        uiEvery: uiEvery
    });
});