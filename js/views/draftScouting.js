/**
 * @name views.draftScouting
 * @namespace Scouting prospects in future drafts.
 */
define(["dao", "globals", "ui", "core/draft", "core/finances", "core/player", "lib/bluebird", "lib/jquery", "lib/knockout", "lib/underscore", "util/bbgmView", "util/helpers"], function (dao, g, ui, draft, finances, player, Promise, $, ko, _, bbgmView, helpers) {
    "use strict";

    var mapping;

    function addSeason(season, tid) {
        return dao.players.getAll({
            index: "tid",
            key: tid
        }).then(function (playersAll) {
            var i, p, pa, players;

            playersAll = player.filter(playersAll, {
                attrs: ["pid", "name", "pos", "age", "watch", "valueFuzz","userID"],
                ratings: ["ovr", "pot", "skills", "fuzz"],
                showNoStats: true,
                showRookies: true,
                fuzz: true
            });

            players = [];
            for (i = 0; i < playersAll.length; i++) {
                pa = playersAll[i];

                // Abbrevaite first name to prevent overflows
                pa.name = pa.name.split(" ")[0].substr(0, 1) + ". " + pa.name.split(" ")[1];

                // Attributes
                p = {pid: pa.pid, name: pa.name, userID: pa.userID, pos: pa.pos, age: pa.age, watch: pa.watch, valueFuzz: pa.valueFuzz};

                // Ratings - just take the only entry
                p.ovr = pa.ratings[0].ovr;
                p.pot = pa.ratings[0].pot;
                p.skills = pa.ratings[0].skills;
		
                players.push(p);
            }

            // Rank prospects
            players.sort(function (a, b) { return b.valueFuzz - a.valueFuzz; });
            for (i = 0; i < players.length; i++) {
                players[i].rank = i + 1;
            }

            return {
                players: players,
                season: season
            };
        });
    }

    mapping = {
        seasons: {
            create: function (options) {
                return options.data;
            }
        }
    };

    function updateDraftScouting(inputs, updateEvents) {
        var firstUndraftedTid, seasonOffset;

        if (updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("dbChange") >= 0) {
            // Once a new draft class is generated, if the next season hasn't started, need to bump up year numbers
            if (g.phase < g.PHASE.FREE_AGENCY) {
                seasonOffset = 0;
            } else {
                seasonOffset = 1;
            }

            // In fantasy draft, use temp tid
            if (g.phase === g.PHASE.FANTASY_DRAFT) {
                firstUndraftedTid = g.PLAYER.UNDRAFTED_FANTASY_TEMP;
            } else {
                firstUndraftedTid = g.PLAYER.UNDRAFTED;
            }

            return Promise.all([
                addSeason(g.season + seasonOffset, firstUndraftedTid),
                addSeason(g.season + seasonOffset + 1, g.PLAYER.UNDRAFTED_2),
                addSeason(g.season + seasonOffset + 2, g.PLAYER.UNDRAFTED_3)
            ]).then(function (seasons) {
                return {
                    seasons: seasons
                };
            });
        }
    }

    function customDraftClassHandler(e) {
        var draftClassTid, file, reader, seasonOffset;

        seasonOffset = parseInt(e.target.dataset.index, 10);
        file = e.target.files[0];

        // What tid to replace?
        if (seasonOffset === 0) {
            draftClassTid = g.PLAYER.UNDRAFTED;
        } else if (seasonOffset === 1) {
            draftClassTid = g.PLAYER.UNDRAFTED_2;
        } else if (seasonOffset === 2) {
            draftClassTid = g.PLAYER.UNDRAFTED_3;
        } else {
            throw new Error("Invalid draft class index");
        }

        reader = new window.FileReader();
        reader.readAsText(file);
        reader.onload = function (event) {
            var players, uploadedFile;

            uploadedFile = JSON.parse(event.target.result);

            // Get all players from uploaded files
            players = uploadedFile.players;

            // Filter out any that are not draft prospects
            players = players.filter(function (p) {
                return p.tid === g.PLAYER.UNDRAFTED;
            });

            // Get scouting rank, which is used in a couple places below
            dao.teams.get({key: g.userTid}).then(function (t) {
                var scoutingRank, tx;

                scoutingRank = finances.getRankLastThree(t, "expenses", "scouting");

                // Delete old players from draft class
                tx = dao.tx(["players", "playerStats"], "readwrite");
                dao.players.iterate({
                    ot: tx,
                    index: "tid",
                    key: IDBKeyRange.only(draftClassTid),
                    callback: function (p) {
                        return dao.players.delete({ot: tx, key: p.pid});
                    }
                }).then(function () {
                    var draftYear, i, uploadedSeason,createUndrafted;

                    // Find season from uploaded file, for age adjusting
                    if (uploadedFile.hasOwnProperty("gameAttributes")) {
                        for (i = 0; i < uploadedFile.gameAttributes.length; i++) {
                            if (uploadedFile.gameAttributes[i].key === "season") {
                                uploadedSeason = uploadedFile.gameAttributes[i].value;
                                break;
                            }
                        }
                    } else if (uploadedFile.hasOwnProperty("startingSeason")) {
                        uploadedSeason = uploadedFile.startingSeason;
                    }

                    // Set draft year
                    draftYear = g.season + seasonOffset;
                    if (g.phase >= g.PHASE.FREE_AGENCY) {
                        // Already generated next year's draft, so bump up one
                        draftYear += 1;
                    }
					
					// sortChampRoles?
					// get top champs for each role
					var cpSorted;
					cpSorted = [];
					
					for (i = 0; i < _.size(g.cpDefault); i++) {
						cpSorted.push({"champion": g.cpDefault[i].champion,"cpid": g.cpDefault[i].cpid,"rank": g.cpDefault[i].rank,"role": g.cpDefault[i].role});
					}					
					
					cpSorted.sort(function (a, b) { return a.rank - b.rank; });		
					
					var topADC,topMID,topJGL,topTOP,topSUP;

					topADC = [];
					topMID = [];
					topJGL = [];
					topTOP = [];
					topSUP = [];

					for (i = 0; i < _.size(cpSorted); i++) {
						if ((cpSorted[i].role == "ADC") && (topADC.length < 5) ) {
					//	   console.log(_.size(cDefault));
							for (j = 0; j < _.size(g.cCache); j++) {
								if (g.cCache[j].name == cpSorted[i].champion) {
									topADC.push(g.cCache[j].hid);
									j = _.size(g.cCache);
								}
							}
						}
						if ((cpSorted[i].role == "Middle") && (topMID.length < 5) ) {
		//				  topMID.push(cpSorted[i].cpid);
							for (j = 0; j < _.size(g.cCache); j++) {
								if (g.cCache[j].name == cpSorted[i].champion) {
									topMID.push(g.cCache[j].hid);
									j = _.size(g.cCache);
								}
							}
						}
						if ((cpSorted[i].role == "Jungle") && (topJGL.length < 5) ) {
		//				  topJGL.push(cpSorted[i].cpid);
							for (j = 0; j < _.size(g.cCache); j++) {
								if (g.cCache[j].name == cpSorted[i].champion) {
									topJGL.push(g.cCache[j].hid);
									j = _.size(g.cCache);
								}
							}
						}
						if ((cpSorted[i].role == "Top") && (topTOP.length < 5) ) {
		//				  topTOP.push(cpSorted[i].cpid);
							for (j = 0; j < _.size(g.cCache); j++) {
								if (g.cCache[j].name == cpSorted[i].champion) {
									topTOP.push(g.cCache[j].hid);
									j = _.size(g.cCache);
								}
							}
						}
						if ((cpSorted[i].role == "Support") && (topSUP.length < 5) ) {
		//				  topSUP.push(cpSorted[i].cpid);
							for (j = 0; j < _.size(g.cCache); j++) {
								if (g.cCache[j].name == cpSorted[i].champion) {
									topSUP.push(g.cCache[j].hid);
									j = _.size(g.cCache);
								}
							}

						}
					
					}							
	
                    // Add new players to database
                    players.forEach(function (p) {
                        // Make sure player object is fully defined						
                        p = player.augmentPartialPlayer(p, scoutingRank,g.cCache,topADC,topMID,topJGL,topTOP,topSUP);

                        // Manually set TID, since at this point it is always g.PLAYER.UNDRAFTED
                        p.tid = draftClassTid;

                        // Manually remove PID, since all it can do is cause trouble
                        if (p.hasOwnProperty("pid")) {
                            delete p.pid;
                        }

                        // Adjust age
                        if (uploadedSeason !== undefined) {
                            p.born.year += g.season - uploadedSeason;
                        }

                        // Adjust seasons
                        p.ratings[0].season = draftYear;
                        p.draft.year = draftYear;						
						
                        // Don't want lingering stats vector in player objects, and draft prospects don't have any stats
                        delete p.stats;

                        player.updateValues(tx, p, []).then(function (p) {
                            dao.players.put({ot: tx, value: p});
                        });
                    });

					createUndrafted = Math.round(g.numTeams * 8 * 3 / 5);
                    // "Top off" the draft class if <70 players imported			
                    if (players.length < createUndrafted) {
                        draft.genPlayers(tx, draftClassTid, scoutingRank, createUndrafted - players.length,g.cCache,topADC,topMID,topJGL,topTOP,topSUP);
                    }
                });

                tx.complete().then(function () {
                    ui.realtimeUpdate(["dbChange"]);
                });
            });
        };
    }

    function uiFirst(vm) {
        ui.title("Future Prospects");

        ko.computed(function () {
            var i, seasons;
            seasons = vm.seasons();
            for (i = 0; i < seasons.length; i++) {
                ui.datatableSinglePage($("#draft-scouting-" + i), 4, _.map(seasons[i].players, function (p) {
//                    return [String(p.rank), helpers.playerNameLabels(p.pid, p.userID, undefined, p.skills, p.watch), p.pos, String(p.age), String(p.ovr), String(p.pot)];
                    return [String(p.rank), helpers.playerNameLabels(p.pid, p.userID, undefined, undefined, p.watch), p.pos, String(p.age), String(p.ovr), String(p.pot)];
                }));
            }
        }).extend({throttle: 1});

        ui.tableClickableRows($("#draft-scouting"));
    }

    function uiEvery() {
        var i, uploadFileButtons;

        // Handle custom roster buttons - this needs to be in uiEvery or it's lost when page reloads
        // This could somehow lead to double calling customDraftClassHandler, but that doesn't seem to actually happen
        uploadFileButtons = document.getElementsByClassName("custom-draft-class");
        for (i = 0; i < uploadFileButtons.length; i++) {
            uploadFileButtons[i].addEventListener("change", customDraftClassHandler);
        }

        // Same uiEvery rationale as above
        document.getElementById("toggle-0").addEventListener("click", function (e) {
            e.preventDefault();
            this.style.display = "none";
            document.getElementById("form-0").style.display = "block";
        });
        document.getElementById("toggle-1").addEventListener("click", function (e) {
            e.preventDefault();
            this.style.display = "none";
            document.getElementById("form-1").style.display = "block";
        });
        document.getElementById("toggle-2").addEventListener("click", function (e) {
            e.preventDefault();
            this.style.display = "none";
            document.getElementById("form-2").style.display = "block";
        });
    }

    return bbgmView.init({
        id: "draftScouting",
        mapping: mapping,
        runBefore: [updateDraftScouting],
        uiFirst: uiFirst,
        uiEvery: uiEvery
    });
});