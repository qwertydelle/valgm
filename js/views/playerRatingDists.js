/**
 * @name views.playerRatingDists
 * @namespace Player rating distributions.
 */
define(["dao", "globals", "ui", "core/player", "lib/boxPlot", "lib/jquery", "lib/knockout", "lib/underscore", "views/components", "util/bbgmView", "util/helpers"], function (dao, g, ui, player, boxPlot, $, ko, _, components, bbgmView, helpers) {
    "use strict";

    function get(req) {
        return {
            season: helpers.validateSeason(req.params.season)
        };
    }

    function InitViewModel() {
        this.season = ko.observable();
    }

    function updatePlayers(inputs, updateEvents, vm) {
        if (updateEvents.indexOf("dbChange") >= 0 || (inputs.season === g.season && (updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("playerMovement") >= 0)) || inputs.season !== vm.season()) {
            return dao.players.getAll({
                statsSeasons: [inputs.season]
            }).then(function (players) {
                var ratingsAll;

                players = player.filter(players, {
                    ratings: ["ovr", "pot", "hgt", "stre", "spd", "jmp", "endu", "ins", "dnk", "ft", "fg", "tp", "blk", "stl", "drb", "pss", "reb"],
                    season: inputs.season,
                    showNoStats: true,
                    showRookies: true,
                    fuzz: true
                });

                ratingsAll = _.reduce(players, function (memo, player) {
                    var rating;
                    for (rating in player.ratings) {
                        if (player.ratings.hasOwnProperty(rating)) {
                            if (memo.hasOwnProperty(rating)) {
                                memo[rating].push(player.ratings[rating]);
                            } else {
                                memo[rating] = [player.ratings[rating]];
                            }
                        }
                    }
                    return memo;
                }, {});

                return {
                    season: inputs.season,
                    ratingsAll: ratingsAll
                };
            });
        }
    }

    function uiFirst(vm) {
        var rating, tbody;

        ko.computed(function () {
            ui.title("Player Rating Distributions - " + vm.season());
        }).extend({throttle: 1});


        tbody = $("#player-rating-dists tbody");

        for (rating in vm.ratingsAll) {
            if (vm.ratingsAll.hasOwnProperty(rating)) {

                let actualName = rating;

                //Change rating names(Maybe there is a better way to do)
                if(actualName === "hgt") {
                    actualName = "Adapt."
                } else if(actualName === "stre") {
                    actualName = "Patience"
                } else if(actualName === "spd") {
                    actualName = "Consistency"
                } else if(actualName === "jmp") {
                    actualName = "Team Player"
                } else if(actualName === "endu") {
                    actualName = "Leadership"
                } else if(actualName === "ins") {
                    actualName = "Awareness"
                } else if(actualName === "dnk") {
                    actualName = "Utility Usage"
                } else if(actualName === "ft") {
                    actualName = "Team Fighting"
                } else if(actualName === "fg") {
                    actualName = "Risk Taking"
                } else if(actualName === "tp") {
                    actualName = "Positioning"
                } else if(actualName === "blk") {
                    actualName = "Aim"
                } else if(actualName === "stl") {
                    actualName = "Clutch"
                } else if(actualName === "drb") {
                    actualName = "Movement"
                } else if(actualName === "pss") {
                    actualName = "Stamina"
                } else if(actualName === "reb") {
                    actualName = "Injury Resistant"
                }
                 
                tbody.append('<tr><td style="text-align: right; padding-right: 1em;">' + actualName + '</td><td width="100%"><div id="' + rating + 'BoxPlot"></div></td></tr>');
            }
        }

        ko.computed(function () {
            var rating;

            for (rating in vm.ratingsAll) {
                if (vm.ratingsAll.hasOwnProperty(rating)) {
                    boxPlot.create({
                        data: vm.ratingsAll[rating](),
                        scale: [0, 100],
                        container: rating + "BoxPlot"
                    });
                }
            }
        }).extend({throttle: 1});
    }

    function uiEvery(updateEvents, vm) {
        components.dropdown("player-rating-dists-dropdown", ["seasons"], [vm.season()], updateEvents);
    }

    return bbgmView.init({
        id: "playerRatingDists",
        get: get,
        InitViewModel: InitViewModel,
        runBefore: [updatePlayers],
        uiFirst: uiFirst,
        uiEvery: uiEvery
    });
});