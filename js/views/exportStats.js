/**
 * @name views.exportRosters
 * @namespace Export rosters.
 */
define(["dao", "globals", "ui", "core/player", "lib/bluebird", "lib/underscore", "util/bbgmView", "util/helpers"], function (dao, g, ui, player, Promise, _, bbgmView, helpers) {
    "use strict";

    function genFileName(leagueName, season, grouping) {
        var fileName;

        fileName = "LOLGM_" + leagueName.replace(/[^a-z0-9]/gi, '_') + "_" + season + "_" + (season === "all" ? "seasons" : "season") + (grouping === "averages" ? "_Average_Stats" : "_Game_Stats");

        return fileName + ".csv";
    }

    // playerAveragesCSV(2015) - just 2015 stats
    // playerAveragesCSV("all") - all stats
    function playerAveragesCSV(season) {
        return dao.players.getAll({
            statsSeasons: season === "all" ? "all" : [season]
        }).then(function (players) {
            var output, seasons;

            // Array of seasons in stats, either just one or all of them
            seasons = _.uniq(_.pluck(_.flatten(_.pluck(players, "stats")), "season"));

            output = "pid,Name,Pos,Age,Team,Season,GP,GS,Min,Region,ChK,ChD,ChA,ChKDA,ChSC,TwrD,TwrA,TwrSC,InhibD,InhibA,CS,CSOpp,CS20,CSOpp20,Jgl,Rvr,DrK,DrA,BrnK,BrnA,G(k)\n";

            seasons.forEach(function (s) {
                player.filter(players, {
                    attrs: ["pid", "name", "pos", "age","born"],
                    stats: ["abbrev", "gp", "gs", "min", "fg", "fga", "fgp", "tp", "tpa", "tpp", "ft", "fta", "ftp", "orb", "drb", "trb", "ast", "tov", "stl", "blk", "pf", "pts", "per", "ewa","fgLowPost","fgaLowPost","fgMidRange","oppJM","kda","scTwr","scKills"],
                    season: s
                }).forEach(function (p) {
                    output += [p.pid, p.name, p.pos, p.age,  p.born.loc, p.stats.abbrev, s, p.stats.gp, p.stats.gs, p.stats.min, p.born.loc, p.stats.fg, p.stats.fga, p.stats.fgp, p.stats.kda, p.stats.sckills, p.stats.pf, p.stats.orb, p.stats.scTwr, p.stats.fgaLowPost, p.stats.fgLowPost, p.stats.tp, p.stats.tpa, p.stats.ft, p.stats.fta, p.stats.fgMidRange, p.stats.oppJM, p.stats.drb, p.stats.blk, p.stats.tov, p.stats.ast, p.stats.trb].join(",") + "\n";
                });
            });

            return output;
        });
    }

    // playerAveragesCSV(2015) - just 2015 games
    // playerAveragesCSV("all") - all games
    function playerGamesCSV(season) {
        var gamesPromise;

        if (season === "all") {
            gamesPromise = dao.games.getAll();
        } else {
            gamesPromise = dao.games.getAll({index: "season", key: season});
        }
        return gamesPromise.then(function (games) {
            var i, j, output, seasons, gameStats, t, t2, teams;

            output = "pid,Name,Pos,Team,Opp,Score,WL,Season,Playoffs,Min,ChK,ChD,ChA,ChKDA,ChSC,TwrD,TwrA,TwrSC,InhibD,InhibA,CS,CSOpp,CS20,CSOpp20,Jgl,Rvr,DrK,DrA,BrnK,BrnA,G(k)\n";

            teams = _.pluck(games, "teams");
            seasons = _.pluck(games, "season");
            for (i = 0; i < teams.length; i++) {
                for (j = 0; j < 2; j++) {
                    t = teams[i][j];
                    t2 = teams[i][j === 0 ? 1 : 0];
                    t.players.forEach(function (p) {
                        output += [p.pid, p.name, p.pos, g.teamAbbrevsCache[t.tid], g.teamAbbrevsCache[t2.tid], t.pts + "-" + t2.pts, t.pts > t2.pts ? "W" : "L", seasons[i],  games[i].playoffs, p.min, p.fg, p.fga, p.fgp, p.kda, p.sckills, p.pf, p.orb, p.scTwr, p.fgaLowPost, p.fgLowPost, p.tp, p.tpa, p.ft, p.fta, p.fgMidRange, p.oppJM, p.drb, p.blk, p.tov, p.ast, p.trb].join(",") + "\n";
                    });
                }
            }

            return output;
        });
    }

    function InitViewModel() {
        this.formChanged = function () {
            // Clear old link when form changes
            document.getElementById("download-link").innerHTML = ""; // Clear "Generating..."
        };
    }

    function post(req) {
        var csvPromise, downloadLink, objectStores, season, statsSeasons;

        downloadLink = document.getElementById("download-link");
        downloadLink.innerHTML = "Generating...";

        season = req.params.season === "all" ? "all" : parseInt(req.params.season, 10);

        if (req.params.grouping === "averages") {
            csvPromise = playerAveragesCSV(season);
        } else if (req.params.grouping === "games") {
            csvPromise = playerGamesCSV(season);
        } else {
            throw new Error("This should never happen");
        }

        Promise.all([
            csvPromise,
            dao.leagues.get({key: g.lid})
        ]).spread(function (output, l) {
            var a, blob, fileName, url;

            blob = new Blob([output], {type: "text/csv"});
            url = window.URL.createObjectURL(blob);

            fileName = genFileName(l.name, season, req.params.grouping);

            a = document.createElement("a");
            a.download = fileName;
            a.href = url;
            a.textContent = "Download Exported Stats";
            a.dataset.noDavis = "true";
//                a.click(); // Works in Chrome to auto-download, but not Firefox

            downloadLink.innerHTML = ""; // Clear "Generating..."
            downloadLink.appendChild(a);

            // Delete object, eventually
            window.setTimeout(function () {
                window.URL.revokeObjectURL(url);
                downloadLink.innerHTML = "Download link expired."; // Remove expired link
            }, 60 * 1000);
        });
    }

    function updateExportStats(inputs, updateEvents) {
        var j, options, seasons;

        if (updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("newPhase") >= 0 || updateEvents.indexOf("dbChange") >= 0) {
            seasons = helpers.getSeasons();
            options = [{
                key: "all",
                val: "All Seasons"
            }];
            for (j = 0; j < seasons.length; j++) {
                options.push({
                    key: seasons[j].season,
                    val: seasons[j].season + " season"
                });
            }
            return {seasons: options};
        }
    }

    function uiFirst() {
        ui.title("Export Stats");
    }

    return bbgmView.init({
        id: "exportStats",
        InitViewModel: InitViewModel,
        post: post,
        runBefore: [updateExportStats],
        uiFirst: uiFirst
    });
});