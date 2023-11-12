/**
 * @name core.phase
 * @namespace Anything related to moving between phases of the game (e.g. regular season, playoffs, draft, etc.).
 */
 
 define(["dao", "globals", "ui", "core/contractNegotiation", "core/draft", "core/finances", "core/freeAgents", "core/player", "core/season", "core/team", "lib/bluebird", "lib/underscore", "util/account", "util/ads", "util/eventLog", "util/helpers", "util/lock", "util/message", "util/random"], function (dao, g, ui, contractNegotiation, draft, finances, freeAgents, player, season, team, Promise, _, account, ads, eventLog, helpers, lock, message, random) {
    "use strict";
	
    var phaseChangeTx;	
	
    /**
     * Common tasks run after a new phrase is set.
     *
     * This updates the phase, executes a callback, and (if necessary) updates the UI. It should only be called from one of the NewPhase* functions defined below.
     *
     * @memberOf core.phase
     * @param {number} phase Integer representing the new phase of the game (see other functions in this module).
     * @param {string=} url Optional URL to pass to ui.realtimeUpdate for redirecting on new phase. If undefined, then the current page will just be refreshed.
     * @param {Array.<string>=} updateEvents Optional array of strings.
     * @return {Promise}
     */
    function finalize(phase, url, updateEvents) {
        updateEvents = updateEvents !== undefined ? updateEvents : [];

        // Set phase before updating play menu
        return require("core/league").setGameAttributesComplete({phase: phase, phaseChangeInProgress: false}).then(function () {
            ui.updatePhase(g.season + " " +  g.PHASE_TEXT[phase]);
            return ui.updatePlayMenu(null).then(function () {
                // Set lastDbChange last so there is no race condition (WHAT DOES THIS MEAN??)
                require("core/league").updateLastDbChange();
                updateEvents.push("newPhase");
                ui.realtimeUpdate(updateEvents, url);
            });
        }).then(function () {
            // If auto-simulating, initiate next action
            if (g.autoPlaySeasons > 0) {
				// Not totally sure why setTimeout is needed, but why not?
                setTimeout(function () {
                    require("core/league").autoPlay();
                }, 100);
            }			
        });
    }	
	

    function newPhasePreseason(tx) {
        return freeAgents.autoSign(tx).then(function () { // Important: do this before changing the season or contracts and stats are fucked up
            return require("core/league").setGameAttributes(tx, {season: g.season + 1});
        }).then(function () {
            var coachingRanks, scoutingRank;

            coachingRanks = [];
			
			return dao.champions.getAll({
							ot: tx
						}).then(function (c) {
						
							return dao.championPatch.getAll({
										ot: tx
									}).then(function (cp) {
									
									
									/*console.log(c.length);
									console.log(cp.length);
									console.log(_.size(c));
									console.log(_.size(cpSorted));*/
									
										var i,j;
										var cpSorted;
										var topADC,topMID,topJGL,topTOP,topSUP;
										
										cpSorted = [];
										
										for (i = 0; i < _.size(cp); i++) {
											cpSorted.push({"champion": cp[i].champion,"cpid": cp[i].cpid,"rank": cp[i].rank,"role": cp[i].role});
										}					
										
										cpSorted.sort(function (a, b) { return a.rank - b.rank; });		
										

										topADC = [];
										topMID = [];
										topJGL = [];
										topTOP = [];
										topSUP = [];

										for (i = 0; i < _.size(cpSorted); i++) {
											if ((cpSorted[i].role == "ADC") && (topADC.length < 5) ) {
										//	   console.log(_.size(c));
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topADC.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Middle") && (topMID.length < 5) ) {
							//				  topMID.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topMID.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Jungle") && (topJGL.length < 5) ) {
							//				  topJGL.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topJGL.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Top") && (topTOP.length < 5) ) {
							//				  topTOP.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topTOP.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Support") && (topSUP.length < 5) ) {
							//				  topSUP.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topSUP.push(c[j].hid);
														j = _.size(c);
													}
												}

											}
										
										}											
									
									
								/*	console.log(topADC);
									console.log(topMID);
									console.log(topJGL);
									console.log(topTOP);
									console.log(topSUP);									*/
										//return draft.genPlayers(null, g.PLAYER.UNDRAFTED_3,null,null,c,topADC,topMID,topJGL,topTOP,topSUP);
										// Add row to team stats and season attributes
										return dao.teams.iterate({
											ot: tx,
											callback: function (t) {
												// Save the coaching rank for later
												coachingRanks[t.tid] = _.last(t.seasons).expenses.coaching.rank;

												// Only need scoutingRank for the user's team to calculate fuzz when ratings are updated below.
												// This is done BEFORE a new season row is added.
												if (t.tid === g.userTid) {
													scoutingRank = finances.getRankLastThree(t, "expenses", "scouting");
												}

												t = team.addSeasonRow(t);
												t = team.addStatsRow(t);

												return t;
											}
										}).then(function () {
											// Loop through all non-retired players
											return dao.players.iterate({
												ot: tx,
												index: "tid",
												key: IDBKeyRange.lowerBound(g.PLAYER.FREE_AGENT),
												callback: function (p) {
													// Update ratings
													p = player.addRatingsRow(p, scoutingRank);
													p = player.develop(p, 1, false, coachingRanks[p.tid],topADC,topMID,topJGL,topTOP,topSUP);

													// Update player values after ratings changes
													return player.updateValues(tx, p, []).then(function (p) {
														// Add row to player stats if they are on a team
														if (p.tid >= 0) {
															p = player.addStatsRow(tx, p, false);
														}
														return p;
													});
												}
											});
										});							
							
/*							return draft.genPlayers(null, g.PLAYER.UNDRAFTED_3,null,null,t).then(function() {
							});						*/
									});							
            }).then(function () {
                if (g.autoPlaySeasons > 0) {
                    return require("core/league").setGameAttributes(tx, {autoPlaySeasons: g.autoPlaySeasons - 1});
                }
            }).then(function () {				
				
				
				if (g.autoPlaySeasons == 0) {				
					if (g.enableLogging && !window.inCordova) {
						ads.show();
					}
				}

                return [undefined, ["playerMovement"]];
            });
        });
    }

    function newPhaseRegularSeason(tx) {

	
		return team.filter({
				attrs: ["tid","did", "cid"],
				season: g.season,
	            ot: tx
		}).then(function (teams) {	
			//var tx;		
			//tx = dao.tx("schedule", "readwrite");
			
			return season.setSchedule(tx, season.newSchedule(teams)).then(function () {
			//return setSchedule(newSchedule()).then(function () {
				console.log("got here");

				// First message from owner
				if (g.showFirstOwnerMessage) {
					return message.generate(tx, {wins: 0, playoffs: 0, money: 0});
				}

				// Spam user with another message?
				if (localStorage.nagged === "true") {
					// This used to store a boolean, switch to number
					localStorage.nagged = "1";
				}

				if (g.season === g.startingSeason + 3 && g.lid > 3 && !localStorage.nagged) {
					localStorage.nagged = "1";
					return dao.messages.add({
						ot: tx,
						value: {
							read: false,
							from: "The Commissioner",
							year: g.season,
							text: '<p>Hi. Sorry to bother you, but I noticed that you\'ve been playing this game a bit. Hopefully that means you like it. Either way, we would really appreciate some feedback so we can make this game better. <a href="mailto:baseball@zengm.com">Send an email</a> (baseball@zengm.com) or <a href="http://www.reddit.com/r/ZenGMLOL/">join the discussion on Reddit</a>.</p>'
						}
					});
		        } 
				if ((localStorage.nagged === "1" && Math.random() < 0.25) || (localStorage.nagged === "2" && Math.random < 0.025)) {
					localStorage.nagged = "2";					
					return dao.messages.add({
						ot: tx,
						value: {
							read: false,
							from: "The Commissioner",
							year: g.season,
							text: '<p>Hi. Sorry to bother you again, but if you like the game, please share it with your friends! Also:</p><p><a href="https://twitter.com/ZenGMGames">Follow Zen GM on Twitter</a></p><p><a href="https://www.facebook.com/ZenGMGames">Like Zen GM on Facebook</a></p><p><a href="http://www.reddit.com/r/ZenGMLOL/">Discuss LOL GM on Reddit</a></p><p>The more people that play LOL GM, the more motivation I have to continue improving it. So it is in your best interest to help me promote the game! If you have any other ideas, please <a href="mailto:baseball@zengm.com">email me</a>.</p>'
						}					
					});
				}
  /*      }).catch(function (err) {
            // If there was any error in the phase change, abort transaction
            tx.abort();
            throw err;			
        });

        return tx.complete().then(function () {
            return newPhaseFinalize(g.PHASE.REGULAR_SEASON);*/
			}).then(function () {
				return [undefined, ["playerMovement"]];
			});
		
        });
    }

    function newPhaseAfterTradeDeadline() {
        return newPhaseFinalize(g.PHASE.AFTER_TRADE_DEADLINE);
    }

    function newPhasePlayoffs(tx) {
		
		
  //      var  tx;

   //     phaseChangeTx = dao.tx(["players", "playerStats", "playoffSeries", "releasedPlayers", "schedule", "teams"], "readwrite");		
        // Achievements after regular season
        //account.checkAchievement.septuawinarian();
        account.checkAchievement.eating();

        // Set playoff matchups
        return team.filter({
            ot: tx,
            attrs: ["tid", "cid"],
            seasonAttrs: ["winp","cidNext"],
            stats: ["kda","fg","fga","fgp","oppTw","pf"],							
            season: g.season,
//            sortBy: ["winp","kda"]
            sortBy: ["winp","diffTower","kda"]
        }).then(function (teams) {
            var cid, i, series, teamsConf, tidPlayoffs, teamsConf2,teamsConf3;
			var tidPromotion,tidDemotion,tidRegionals;

			var tidLCSChamp,tidLCS,tidLCSPromotion,tidCS,tidCSPromotion,tidCSPromotionTop,tidLadder,tidCSstay;
            // Add entry for wins for each team; delete winp, which was only needed for sorting
            for (i = 0; i < teams.length; i++) {
                teams[i].won = 0;
            }

            tidPlayoffs = [];
			
            tidPromotion = [];			
            tidDemotion = [];		
			
            tidRegionals = [];					
			
            tidLCSChamp = [];					
            tidLCS = [];					
            tidLCSPromotion = [];					
            tidCSstay = [];				
            tidCS = [];					
            tidCSPromotion = [];					
            tidLadder = [];	
			tidCSPromotionTop = [];

   /*         series = [[], [], [], []];  // First round, second round, third round, fourth round
            for (cid = 0; cid < 2; cid++) {
                teamsConf = [];
                for (i = 0; i < teams.length; i++) {
                    if (teams[i].cid === cid) {
                        if (teamsConf.length < 8) {
                            teamsConf.push(teams[i]);
                            tidPlayoffs.push(teams[i].tid);
                        }
                    }
                }
                series[0][cid * 4] = {home: teamsConf[0], away: teamsConf[7]};
                series[0][cid * 4].home.seed = 1;
                series[0][cid * 4].away.seed = 8;
                series[0][1 + cid * 4] = {home: teamsConf[3], away: teamsConf[4]};
                series[0][1 + cid * 4].home.seed = 4;
                series[0][1 + cid * 4].away.seed = 5;
                series[0][2 + cid * 4] = {home: teamsConf[2], away: teamsConf[5]};
                series[0][2 + cid * 4].home.seed = 3;
                series[0][2 + cid * 4].away.seed = 6;
                series[0][3 + cid * 4] = {home: teamsConf[1], away: teamsConf[6]};
                series[0][3 + cid * 4].home.seed = 2;
                series[0][3 + cid * 4].away.seed = 7;
            }*/

		   teamsConf = [];
			teamsConf2 = [];
			teamsConf3 = [];

//			series = [[], [], [], [], []];  // First round, second round, third round, fourth round
			series = [[], [], [], [], [], [], [], [], [], [], [], []];  // First round, second round, third round, fourth round
			
			//if ((g.gameType == 0) || (g.gameType == 1)) {
			if ((g.gameType == 0) || (g.gameType == 1) || (g.gameType == 5)) {			
			
				for (cid = 0; cid < 1; cid++) {
					for (i = 0; i < teams.length; i++) {
						if (teams[i].cid === cid) {
							teamsConf.push(teams[i]);
						}						
					}	
					// adjust everything to i, and make adjustable to conference length
					// then do same for cid 1
					for (i = 0; i < teamsConf.length; i++) {
						if (i<6) {
							tidPlayoffs.push(teamsConf[i].tid);
							if (g.gameType==1) {								
								tidLCSChamp.push(teamsConf[i].tid);
							}
						}						
						/*if ( (teamsConf.length>6) && (g.gameType==1) ) {						    
							tidPlayoffs.push(teams[i].tid);
							tidDemotion.push(teams[i].tid);							
						}*/
						if ( (i<(teamsConf.length-3)) && (g.gameType==1) ) {						    
							tidLCS.push(teamsConf[i].tid);
						}
						if ( ((i==(teamsConf.length-3)) || (i==(teamsConf.length-2) )) && (g.gameType==1) ) {						    
							tidLCSPromotion.push(teamsConf[i].tid);
						}
						if ( (i==(teamsConf.length-1))  && (g.gameType==1) ) {						    
							tidCS.push(teamsConf[i].tid);
						}
				
					}	
			
					series[0][  0 ] = {home: teamsConf[3], away: teamsConf[4]};
					series[0][ 0 ].home.seed = 4;
					series[0][ 0 ].away.seed = 5;	

					
					series[1][0] = {home: teamsConf[0],away: teamsConf[0] };
					series[1][0].home.seed = 1;
					
					series[0][1 ] = {home: teamsConf[2], away: teamsConf[5]};
					series[0][1 ].home.seed = 3;
					series[0][1 ].away.seed = 6;							
					
					series[1][1] = {home: teamsConf[1],away: teamsConf[1] };
					series[1][1].home.seed = 2;
					
				}			
				
			}
			
			if (g.gameType == 1) {
				var topSeedDone;
				topSeedDone = false;
			
			   for (cid = 1; cid < 2; cid++) {
					for (i = 0; i < teams.length; i++) {
						//	console.log("cid: "+teams[i].cid+" "+teams[i].cidNext);

						if (teams[i].cid === cid) {
							teamsConf2.push(teams[i]);
						}						
					}	
					for (i = 0; i < teamsConf2.length; i++) {					
//						if (i<(teamsConf2.length-2)) {
						if (i<4) {
							tidPlayoffs.push(teamsConf2[i].tid);
							tidPromotion.push(teamsConf2[i].tid);
							tidLCSPromotion.push(teamsConf2[i].tid);							
						}
						if ( (i>=4) && (i<=(teamsConf2.length-3))) {
							tidCSstay.push(teamsConf2[i].tid);												
						}
						if (i>(teamsConf2.length-3)) {
					//		tidPlayoffs.push(teams[i].tid);
							tidDemotion.push(teamsConf2[i].tid);
							if (topSeedDone	== false) {
								tidCSPromotionTop.push(teamsConf2[i].tid);							
							} else {
								tidCSPromotion.push(teamsConf2[i].tid);														
							}
						}												
					}	

					
					series[0][  2 ] = {home: teamsConf2[0], away: teamsConf2[3]};
					series[0][ 2 ].home.seed = 1;
					series[0][ 2 ].away.seed = 4;	

					series[0][3  ] = {home: teamsConf2[1], away: teamsConf2[2]};
					series[0][ 3 ].home.seed = 2;
					series[0][ 3 ].away.seed = 3;							

					
/*					series[2][2] = {home: teamsConf[teamsConf.length-3],away: teamsConf[teamsConf.length-3] };
					series[2][2].home.seed = teamsConf.length-2;

					series[2][3] = {home: teamsConf[teamsConf.length-2],away: teamsConf[teamsConf.length-2] };
					series[2][3].home.seed = teamsConf.length-1;	*/
					series[2][2] = {home: teamsConf[teamsConf.length-2],away: teamsConf[teamsConf.length-2] };
					series[2][2].home.seed = teamsConf.length-1;

					series[2][3] = {home: teamsConf[teamsConf.length-3],away: teamsConf[teamsConf.length-3] };
					series[2][3].home.seed = teamsConf.length-2;	
					
	/*				series[2][2] = {home: teamsConf[4],away: teamsConf[4] };
					series[2][2].home.seed = 5;

					series[2][3] = {home: teamsConf[5],away: teamsConf[5] };
					series[2][3].home.seed = 6;											*/
					
				}			

				for (cid = 2; cid < 3; cid++) {
						//	console.log(teamsConf2);
					for (i = 0; i < teams.length; i++) {
					
						//	console.log("cid: "+teams[i].cid+" "+teams[i].cidNext);

					// need to user other cid variable:
						if (teams[i].cid === cid) {
						 
							teamsConf3.push(teams[i]);

							if (teamsConf3.length<11) {
								tidPlayoffs.push(teams[i].tid);
								tidPromotion.push(teams[i].tid);							
								tidCSPromotion.push(teams[i].tid);							
							} else {
								tidLadder.push(teams[i].tid);							
							}
						}						
					}	

					series[2][4] = {home: teamsConf2[teamsConf2.length-2],away: teamsConf2[teamsConf2.length-2] };
					series[2][4].home.seed = teamsConf2.length-1;
					
					series[1][5] = {home: teamsConf2[teamsConf2.length-1],away: teamsConf2[teamsConf2.length-1] };
					series[1][5].home.seed = teamsConf2.length;

					
					series[0][4] = {home: teamsConf3[1], away: teamsConf3[6]};
					series[0][4].home.seed = 2;
					series[0][4].away.seed = 7;	
					
					
					series[0][5] = {home: teamsConf3[2], away: teamsConf3[5]};
					series[0][5].home.seed = 3;
					series[0][5].away.seed = 6;							
					
					series[0][6] = {home: teamsConf3[8], away: teamsConf3[9]};
					series[0][6].home.seed = 9;
					series[0][6].away.seed = 10;							
					
					series[0][7] = {home: teamsConf3[0], away: teamsConf3[7]};
					series[0][7].home.seed = 1;
					series[0][7].away.seed = 8;							
					
					series[0][8] = {home: teamsConf3[3], away: teamsConf3[4]};
					series[0][8].home.seed = 4;
					series[0][8].away.seed = 5;							
					


				}						
									
				
			}
			if ((g.gameType == 2)  || (g.gameType == 5)) {			
//					if ((g.gameType == 2) ) {		

					if ((g.gameType == 2) ) {			
						for (i = 0; i < teams.length; i++) {							       
								teamsConf.push(teams[i]);
								if (teamsConf.length<6) {
									tidPlayoffs.push(teams[i].tid);								
								}								
						}							
					}							
					if ((g.gameType == 5) ) {			
						for (cid = 2; cid < 3; cid++) {
							teamsConf = [];						
							for (i = 0; i < teams.length; i++) {		
									if (teams[i].cid === cid) {															
										teamsConf.push(teams[i]);
										if (teamsConf.length<6) {
											tidPlayoffs.push(teams[i].tid);								
										}								
										if (teamsConf.length == 6) {
											tidRegionals.push(teams[i].tid);								
										}											
									}
							}							
						}							
					}						

					series[0][ 9 ] = {home: teamsConf[3], away: teamsConf[4]};
					series[0][ 9 ].home.seed = 4;
					series[0][ 9 ].away.seed = 5;	
					
					series[1][7] = {home: teamsConf[2],away: teamsConf[2] };
					series[1][7].home.seed = 3;

					series[2][6] = {home: teamsConf[1],away: teamsConf[1] };
					series[2][6].home.seed = 2;

					series[3][1] = {home: teamsConf[0],away: teamsConf[0] };
					series[3][1].home.seed = 1;
					
					if  (g.gameType == 5) {
						series[6][5] = {home: teamsConf[5],away: teamsConf[5] };
						series[6][5].home.seed = 6;
						series[6][5].away.seed = 6;
					}
					
			}		

			if ((g.gameType == 3)  || (g.gameType == 5)) {			
/*							for (i = 0; i < teams.length; i++) {
							teamsConf.push(teams[i]);
					}							*/

					if ((g.gameType == 3) ) {			
						for (i = 0; i < teams.length; i++) {							       
								teamsConf.push(teams[i]);
								if (teamsConf.length<9) {
									tidPlayoffs.push(teams[i].tid);								
								}								
						}							
					}							
					if ((g.gameType == 5) ) {			
						for (cid = 3; cid < 4; cid++) {
							teamsConf = [];
						
							for (i = 0; i < teams.length; i++) {							       
									if (teams[i].cid === cid) {															
										teamsConf.push(teams[i]);
										if (teamsConf.length<9) {
											tidPlayoffs.push(teams[i].tid);								
										}								
							
									}
							}							
						}							
					}							

					series[0][ 10 ] = {home: teamsConf[6], away: teamsConf[7]};
					series[0][ 10 ].home.seed = 7;
					series[0][ 10 ].away.seed = 8;	
					
					series[1][8] = {home: teamsConf[5],away: teamsConf[5] };
					series[1][8].home.seed = 6;

					series[2][7] = {home: teamsConf[4],away: teamsConf[4] };
					series[2][7].home.seed = 5;

					series[3][2] = {home: teamsConf[3],away: teamsConf[3] };
					series[3][2].home.seed = 4;
					
					series[3][3] = {home: teamsConf[2],away: teamsConf[2] };
					series[3][3].home.seed = 3;
					
					series[4][0] = {home: teamsConf[1],away: teamsConf[1] };
					series[4][0].home.seed = 2;
					
					series[4][1] = {home: teamsConf[0],away: teamsConf[0] };
					series[4][1].home.seed = 1;
					
			}					
			if ((g.gameType == 4)  || (g.gameType == 5)) {			
/*							for (i = 0; i < teams.length; i++) {
							teamsConf.push(teams[i]);
					}							*/

					if ((g.gameType == 4) ) {			
						for (i = 0; i < teams.length; i++) {							       
								teamsConf.push(teams[i]);
								if (teamsConf.length<5) {
									tidPlayoffs.push(teams[i].tid);								
								}	
	
								
						}							
					}							
					if ((g.gameType == 5) ) {			
						for (cid = 4; cid < 5; cid++) {
						teamsConf = [];
						
							for (i = 0; i < teams.length; i++) {							       
									if (teams[i].cid === cid) {															
										teamsConf.push(teams[i]);
										if (teamsConf.length<5) {
											tidPlayoffs.push(teams[i].tid);								
										}								
										if ((teamsConf.length == 5) || (teamsConf.length == 6)) {
											tidRegionals.push(teams[i].tid);								
										}											
									}
							}							
						}							
					}								

					series[0][ 11 ] = {home: teamsConf[2], away: teamsConf[3]};
					series[0][ 11 ].home.seed = 3;
					series[0][ 11 ].away.seed = 4;	
					
					series[1][9] = {home: teamsConf[1],away: teamsConf[1] };
					series[1][9].home.seed = 2;

					series[2][8] = {home: teamsConf[0],away: teamsConf[0] };
					series[2][8].home.seed = 1;
					
					if  (g.gameType == 5) {
					/*	series[6][8] = {home: teamsConf[4],away: teamsConf[4] };
						series[6][8].home.seed = 5;
						series[6][8].away.seed = 5;

						series[6][9] = {home: teamsConf[5],away: teamsConf[5] };
						series[6][9].home.seed = 6;
						series[6][9].away.seed = 6;*/
					}					

			}	
			if (g.gameType == 5) {		

			
	
				for (cid = 1; cid < 2; cid++) {
					teamsConf = [];
				
					for (i = 0; i < teams.length; i++) {
						if (teams[i].cid === cid) {
							teamsConf.push(teams[i]);
							if (teamsConf.length<7) {
								tidPlayoffs.push(teams[i].tid);								
							}
							
						}
					}	

					series[0][  12 ] = {home: teamsConf[3], away: teamsConf[4]};
					series[0][ 12 ].home.seed = 4;
					series[0][ 12 ].away.seed = 5;	
					
					
					series[1][10] = {home: teamsConf[0],away: teamsConf[0] };
					series[1][10].home.seed = 1;
					
					series[0][13 ] = {home: teamsConf[2], away: teamsConf[5]};
					series[0][13 ].home.seed = 3;
					series[0][13 ].away.seed = 6;							
					
					series[1][11] = {home: teamsConf[1],away: teamsConf[1] };
					series[1][11].home.seed = 2;
				}	
			
				for (cid = 5; cid < 6; cid++) {
					teamsConf = [];
					for (i = 0; i < teams.length; i++) {
						if (teams[i].cid === cid) {
							if (teams[i].cid === cid) {															
								teamsConf.push(teams[i]);
								tidPlayoffs.push(teams[i].tid);								
								if (teamsConf.length<5) {
									tidPlayoffs.push(teams[i].tid);								
								}								
							}
						}
					}	


					series[0][ 14 ] = {home: teamsConf[1], away: teamsConf[2]};
					series[0][ 14 ].home.seed = 2;
					series[0][ 14 ].away.seed = 3;	
					
					
					series[0][15 ] = {home: teamsConf[0], away: teamsConf[3]};
					series[0][15 ].home.seed = 1;
					series[0][15 ].away.seed = 4;							
					
/*					series[0][ 12+cid*2 ] = {home: teamsConf[1], away: teamsConf[2]};
					series[0][ 12+cid*2 ].home.seed = 2;
					series[0][ 12+cid*2 ].away.seed = 3;	
					
					
					series[0][13+cid*2 ] = {home: teamsConf[0], away: teamsConf[3]};
					series[0][13+cid*2 ].home.seed = 1;
					series[0][13+cid*2 ].away.seed = 4;							*/
					
				} 
				
			}				
			
			
/*            tidPlayoffs.forEach(function (tid) {
                eventLog.add(null, {
                    type: "playoffs",
                    text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the playoffs</a>.',
                    showNotification: tid === g.userTid,
                    tids: [tid]
                });
            });*/
			console.log("got here");
				tidPlayoffs.forEach(function (tid) {
			
			//remove  tidPromotion tidDemotion, replace with more detailed criteria
					if (g.gameType == 0) {
						eventLog.add(null, {
							type: "playoffs",
							text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made the <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">playoffs</a>.',
							showNotification: tid === g.userTid,
							tids: [tid]												
						});
					}
				//} else					
				});						
					//if (tidLCSPromotion.indexOf(tid) >= 0) {
				tidLCSPromotion.forEach(function (tid) {						
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made the <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">LCS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidCSPromotion.indexOf(tid) >= 0) {
				tidLCSPromotion.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidLadder.indexOf(tid) >= 0) {
				tidLadder.forEach(function (tid) {
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the Ladder conference</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidCS.indexOf(tid) >= 0) {
				tidCS.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidCSstay.indexOf(tid) >= 0) {
				tidCSstay.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidLCS.indexOf(tid) >= 0) {
				tidLCS.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the LCS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				});											
				//} else if (tidLCSChamp.indexOf(tid) >= 0) {
				tidLCSChamp.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the LCS championship playoffs</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});
				});											
				//} else if (tidRegionals.indexOf(tid) >= 0) {
				tidRegionals.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamRegionsCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">regionals</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});
				});											
				//} else {
			/*	tidLCSPromotion.forEach(function (tid) {					
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> did not make <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the playoffs</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});	
				});						*/

		//	});				
			 /*
			
            if (tidPlayoffs.indexOf(g.userTid) >= 0) {
			
			//remove  tidPromotion tidDemotion, replace with more detailed criteria
				if (tidLCSPromotion.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made the <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">LCS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidCSPromotion.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidLadder.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the Ladder conference</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidCS.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidCSstay.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the CS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidLCS.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the LCS</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]												
					});
				} else if (tidLCSChamp.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the LCS championship playoffs</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});
				} else if (tidRegionals.indexOf(g.userTid) >= 0) {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">regionals</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});
				} else {
					eventLog.add(null, {
						type: "playoffs",
						text: 'The <a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[tid], g.season]) + '">' + g.teamNamesCache[tid] + '</a> made <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the playoffs</a>.',
						showNotification: tid === g.userTid,
						tids: [tid]						
					});
				}
				*/
           // } else {
            /*    eventLog.add(null, {
                    type: "playoffs",
                    text: 'Your team didn\'t make <a href="' + helpers.leagueUrl(["playoffs", g.season]) + '">the playoffs</a>.'
                });*/
          //  }
			
			
			/*console.log(tidLCSChamp);
			console.log(tidLCS);
			console.log(tidLCSPromotion);
			console.log(tidCS);
			console.log(tidCSPromotionTop);
			console.log(tidCSPromotion);
			console.log(tidLadder);*/
            return Promise.all([			
				dao.playoffSeries.put({
					ot: tx,
					value: {
						season: g.season,
						currentRound: 0,
						series: series
					}
				}),
				
	//var tidLCSChamp,tidLCS,tidLCSPromotion,tidCS,tidCSPromotion,tidLadder;
				// Add row to team stats and team season attributes
				dao.teams.iterate({
					ot: tx,
					callback: function (t) {
						var teamSeason;

						teamSeason = t.seasons[t.seasons.length - 1];

					//    if (tidPlayoffs.indexOf(t.tid) >= 0) {
						
						if (tidLCS.indexOf(t.tid) >= 0) {
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 20;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .15;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
							
						} else if (tidLCSChamp.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 24;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= 0.80;
							teamSeason.hype += 0.20;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidLCSPromotion.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							if (t.cid == 0) {
								teamSeason.playoffRoundsWon = 17;
							} else {
								teamSeason.playoffRoundsWon = 16;
							}
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .13;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidCS.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 14;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .10;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidCSstay.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							// reall want to change to 13 (stay at CS, not demoted)
							teamSeason.playoffRoundsWon = 13;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .10;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidCSPromotionTop.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 6;
							//teamSeason.playoffRoundsWon = 4;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .03;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidCSPromotion.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							if (t.cid == 1) {
								teamSeason.playoffRoundsWon = 5;
							} else {
								teamSeason.playoffRoundsWon = 4;
							}
							//teamSeason.playoffRoundsWon = 4;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .03;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidLadder.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = -1;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype *= .80;
							teamSeason.hype += .0;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}
						} else if (tidRegionals.indexOf(t.tid) >= 0) {
						
					
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 0;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype += 0.05;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}							
						
						} else if (tidPlayoffs.indexOf(t.tid) >= 0) {
							t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 0;
							//console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype += 0.05;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}			
						} else {
					
						/*	t = team.addStatsRow(t, true);

							teamSeason.playoffRoundsWon = 0;
							console.log(t.tid +" "+teamSeason.playoffRoundsWon);

							// More hype for making the playoffs
							teamSeason.hype += 0.05;
							if (teamSeason.hype > 1) {
								teamSeason.hype = 1;
							}*/
							
						//	}
							
					//    } else {
							// Less hype for missing the playoffs
							teamSeason.playoffRoundsWon = -1;
						//	console.log(t.tid +" "+teamSeason.playoffRoundsWon);
							teamSeason.hype -= 0.05;
							if (teamSeason.hype < 0) {
								teamSeason.hype = 0;
							}
						}

						return t;
					}
				}),

				// Add row to player stats
                Promise.map(tidPlayoffs, function (tid) {
                    return dao.players.iterate({
                        ot: tx,
                        index: "tid",
                        key: tid,
                        callback: function (p) {
                            return player.addStatsRow(tx, p, true);
                        }
                    });
                })				
            ]);
         }).then(function () {
            return Promise.all([
                finances.assessPayrollMinLuxury(tx),
                season.newSchedulePlayoffsDay(tx)
            ]);
		}).then(function () {
			var url;			
			// Don't redirect if we're viewing a live game now
			if (location.pathname.indexOf("/live_game") === -1) {
				url = helpers.leagueUrl(["playoffs"]);
			}			
			return [url, ["teamFinances"]];						
            //return newPhaseFinalize(g.PHASE.PLAYOFFS, url, ["teamFinances"]);
        });
    }		

    function newPhaseBeforeDraft(tx) {
        //var tx;
		var i;

  
		console.log("does the game even get here?");
		
		console.log("does the game even get here?");
		account.checkAchievement.hardware_store();
		//account.checkAchievement.sleeper_pick();	
	
        account.checkAchievement.fed();
        account.checkAchievement.first_blood();
        account.checkAchievement.killing_spree();
        account.checkAchievement.rampage();
        account.checkAchievement.unstoppable();
        account.checkAchievement.dominating();
        account.checkAchievement.godlike();
        account.checkAchievement.legendary();
        account.checkAchievement.ace();
        account.checkAchievement.penta_kill();		
		
        account.checkAchievement.wood();				
        account.checkAchievement.bronze();		
        account.checkAchievement.silver();		
        account.checkAchievement.gold();		
        account.checkAchievement.platinum();		
        account.checkAchievement.diamond();		
        account.checkAchievement.master();		
        account.checkAchievement.challenger();		
        account.checkAchievement.pro();		
		//account.checkAchievement.moneyball();
        account.checkAchievement.ladder_climber();
        account.checkAchievement.ladder_climber2();		
		
        account.checkAchievement.world_beater();			
		
		
        // Select winners of the season's awards
        return season.awards(tx).then(function () {
          //  phaseChangeTx = dao.tx(["events", "messages", "players", "playerStats", "releasedPlayers", "teams","championPatch"], "readwrite");

            // Add award for each player on the championship team
            return team.filter({
                attrs: ["tid"],
                seasonAttrs: ["playoffRoundsWon"],
                season: g.season,
                ot: tx
            });
        }).then(function (teams) {
            var i,j, maxAge, minPot, tid;

            // Give award to all players on the championship team
            for (i = 0; i < teams.length; i++) {
                if ((teams[i].playoffRoundsWon === 3) && (g.gameType == 0)) {
                    tid = teams[i].tid;
                    break;
                } else if ((teams[i].playoffRoundsWon === 27) && (g.gameType == 1)) {
                    tid = teams[i].tid;
                    break;
                } else if ((teams[i].playoffRoundsWon === 4) && (g.gameType == 2)) {
                    tid = teams[i].tid;
                    break;
                } else if ((teams[i].playoffRoundsWon === 6) && (g.gameType == 3)) {
                    tid = teams[i].tid;
                    break;
                } else if ((teams[i].playoffRoundsWon === 3) && (g.gameType == 4)) {
                    tid = teams[i].tid;
                    break;
                } else if ((teams[i].playoffRoundsWon === 6) && (g.gameType == 5)) {
                    tid = teams[i].tid;
                    break;
                }
            }
						
            return dao.players.iterate({
                ot: tx,
                index: "tid",
                key: tid,
                callback: function (p) {
                    p.awards.push({season: g.season, type: "Won Championship"});
                    return p;
                }
        //    });
			}).then(function () {
			
			
			//for (i = 0; i < teams.length.length; i++) {
			//	console.log("going to be moved: "+tid)
		/*		dao.teams.iterate({
					ot: tx,
					callback: function (t) {
						var s;

						s = t.seasons.length - 1;

				//		console.log(t.cid);
				//		console.log(t.seasons[s].cidStart);
				//		console.log(t.seasons[s].cidNext);
						
						//t.cid = 0;
						t.seasons[s].imgURLCountry = t.imgURLCountry;
						//console.log(t.imgURLCountry);
						//console.log(t.seasons[s].imgURLCountry);
						//t.seasons[s].playoffRoundsWon = 3;
						//t.seasons[s].hype += 0.05;

						return t;
					}
				});
				
			}).then(function () {	*/		
			//}			
			
			// change team cid for promotion and demotion
			
			//need to make a list for each conference and convert
			//console.log(g.gameType)
			if (g.gameType == 1) {
			    var newLCS, newCS, newLadder;
				newLCS = [];
				newCS = [];
				newLadder = [];
				
				
				for (i = 0; i < teams.length; i++) {
				 console.log(i+" "+teams[i].playoffRoundsWon);
				//push for each
					if (teams[i].playoffRoundsWon > 16) {
						newLCS.push(teams[i].tid);
					} else if (teams[i].playoffRoundsWon > 6) {
						newCS.push(teams[i].tid);
					} else  {
						newLadder.push(teams[i].tid);
					}
				}				
				console.log(newLCS.length);
				console.log(newCS.length);
				console.log(newLadder.length);				
				console.log(newLCS);
				console.log(newCS);
				console.log(newLadder);				
				console.log("got Here");
			/*	for (i = 0; i < teams.length; i++) {
					if ((teams[i].playoffRoundsWon === 14)) {
						tid = teams[i].tid;
					}
				}			*/
				for (i = 0; i < newLCS.length; i++) {
				//	console.log("going to be moved: "+tid)
					dao.teams.iterate({
						ot: tx,
//						key: tid,
						key: newLCS[i],
						callback: function (t) {
							var s;

							s = t.seasons.length - 1;

					//		console.log(t.cid);
					//		console.log(t.seasons[s].cidStart);
					//		console.log(t.seasons[s].cidNext);
							
							t.cid = 0;
							t.seasons[s].cidNext = 0;
							console.log(t.tid+" "+t.cid);
							console.log(t.tid+" "+t.seasons[s].cidNext);
							//t.seasons[s].playoffRoundsWon = 3;
							//t.seasons[s].hype += 0.05;

							return t;
						}
					});
				
				}
				
				for (i = 0; i < newCS.length; i++) {
					//console.log("going to be moved: "+tid)
					dao.teams.iterate({
						ot: tx,
//						key: tid,
						key: newCS[i],
						callback: function (t) {
							var s;

							s = t.seasons.length - 1;

					//		console.log(t.cid);
					//		console.log(t.seasons[s].cidStart);
					//		console.log(t.seasons[s].cidNext);
							
							t.cid = 1;
							t.seasons[s].cidNext = 1;
							console.log(t.tid+" "+t.cid);
							console.log(t.tid+" "+t.seasons[s].cidNext);
							//t.seasons[s].playoffRoundsWon = 3;
							//t.seasons[s].hype += 0.05;

							return t;
						}
					});
				
				}
				
				for (i = 0; i < newLadder.length; i++) {
					//console.log("going to be moved: "+tid)
					dao.teams.iterate({
						ot: tx,
//						key: tid,
						key: newLadder[i],
						callback: function (t) {
							var s;

							s = t.seasons.length - 1;

					//		console.log(t.cid);
					////		console.log(t.seasons[s].cidStart);
					//		console.log(t.seasons[s].cidNext);
							
							t.cid = 2;
							t.seasons[s].cidNext = 2;
							console.log(t.tid+" "+t.cid);
							console.log(t.tid+" "+t.seasons[s].cidNext);
							//t.seasons[s].playoffRoundsWon = 3;
							//t.seasons[s].hype += 0.05;

							return t;
						}
					});
				
				}				
				
				
						
			}
			
			
			
			// change patch data
		/*	dao.championPatch.iterate({
                ot: tx,
                index: "tid",
                key: IDBKeyRange.lowerBound(g.PLAYER.FREE_AGENT),
                callback: function (p) {			
			       if (update) {
                            return p;
                   }
                }
            });*/
        }).then(function () {			
			console.log(g.patchType);
			// change champion patch rank for game option 0
			if ((g.patchType == 0) || (g.patchType == 2)) {	
				dao.championPatch.iterate({
		//            ot: dao.tx("championPatch", "readwrite"),
					ot: tx,
					callback: function (c) {
					 //   c.champion = req.params.champion[c.cpid];
					 //   c.role = req.params.role[c.cpid];
				//	 console.log(c.rank);
					 c.rank = parseInt(c.rank)
				//	 console.log(c.rank);										 
					c.rank += random.randInt(-20, 20);
				//	 console.log(c.rank);

					if (g.patchType == 0) {
						if (c.rank<1) {
							c.rank = random.randInt(50, 100)
						} else if (c.rank> 150) {
							c.rank = random.randInt(50, 100);
						}
					} else {
						if (c.rank<1) {
							c.rank = random.randInt(1, 20)
						} else if (c.rank> 150) {
							c.rank = random.randInt(130, 150);
						}
					}
					//    c.cpid = req.params.cpid[c.cpid];
						//t.seasons[t.seasons.length - 1].pop = parseFloat(req.params.pop[t.tid]);

					 /*   if (t.tid === g.userTid) {
							userName = t.name;
							userRegion = t.region;
						}*/

						return c;
					}
				})
			} 
            // Do annual tasks for each player, like checking for retirement
        }).then(function () {

            return dao.players.iterate({
                ot: tx,
                index: "tid",
                key: IDBKeyRange.lowerBound(g.PLAYER.FREE_AGENT),
                callback: function (p) {
                    var update;

                    update = false;

					
					
					
					
					
                    // Get player stats, used for HOF calculation
                    return dao.playerStats.getAll({
                        ot: tx,
                        index: "pid, season, tid",
                        key: IDBKeyRange.bound([p.pid], [p.pid, ''])
                    }).then(function (playerStats) {
						var maxAge, minPot;
						// Players meeting one of these cutoffs might retire
						maxAge = 21;
						minPot = 40;
						
                        var age, excessAge, excessPot, pot,injRes,injuryRisk;
						var YWT, country, languages, i;
						
                        age = g.season - p.born.year;
                        pot = p.ratings[p.ratings.length - 1].pot;
                        injRes = p.ratings[p.ratings.length - 1].reb;
						YWT = _.pluck(playerStats, "yearsWithTeam");
						
						// update region if YWT > 2
						// add language if player doesn't have it yet
						if (p.tid >= 0) {
							/* console.log("B: "+p.tid);
							 console.log("B: "+g.teamCountryCache);
							 console.log("B: "+g.teamCountryCache[p.tid]);
							 console.log(p.born.loc);
							 console.log(YWT);*/
						//	 console.log(YWT);
							if ((YWT[YWT.length-2] == 2) || (YWT[YWT.length-3] == 2) || (YWT[YWT.length-1] == 2)) {
							//	console.log(g.teamCountryCache[p.tid]+" "+p.born.loc);
								if (g.teamCountryCache[p.tid] != p.born.loc) {
									p.born.loc = g.teamCountryCache[p.tid];
									update = true;	
									//console.log("A: "+g.teamCountryCache[p.tid]);
									//console.log(p.born.loc);

									country = player.country(p.born.loc);
								//	console.log(country+" "+p.born.country);
									languages = player.languages(country);
								//	console.log(languages+" "+p.languages);									
									if (typeof(p.languages) != 'undefined') {
									//	console.log("notUndefined");
									///	console.log(p.languages.length);
										for (i = 0; i < p.languages.length; i++) {
										//	console.log(languages[0]+" "+p.languages[i]);									
											if (p.languages[i] == languages[0]) {
											//	console.log("already have");
												break;
											} 
											if (i == (p.languages.length-1)) {
												p.languages.push(languages[0]);
												console.log("GOT NEW LANGUAGE"+languages[0]+" "+p.languages);									
											}
										}										
									}
									//console.log(p);
									
								}														
							}
						}
						
                        if (age > maxAge || pot < minPot) {
                            excessAge = 0;
                            if (age > 21 || p.tid === g.PLAYER.FREE_AGENT) {  // Only players older than 21 or without a contract will retire
                                if (age > 21) {
                                    excessAge = (age - 21) / 20;  // 0.05 for each year beyond 24
                                }
                                excessPot = (40 - pot) / 50;  // 0.02 for each potential rating below 40 (this can be negative)
                                injuryRisk = (50-injRes) / 200;  // 0.02 for each potential rating below 40 (this can be negative)
                                if (excessAge + excessPot+injuryRisk + random.gauss(0, 1) > 0) {																
                                    p = player.retire(tx, p, playerStats);
                                    update = true;
                                }
                            }
                        }

                        // Update "free agent years" counter and retire players who have been free agents for more than one years
                        if (p.tid === g.PLAYER.FREE_AGENT) {
                            if (p.yearsFreeAgent >= 1) {
                                p = player.retire(tx, p, playerStats);
                            } else {
                                p.yearsFreeAgent += 1;
                            }
                            p.contract.exp += 1;
                            update = true;
                        } else if (p.tid >= 0 && p.yearsFreeAgent > 0) {
                            p.yearsFreeAgent = 0;
                            update = true;
                        }

                        // Heal injures
                        if (p.injury.type !== "Healthy") {
                            if (p.injury.gamesRemaining <= 15) {
                                p.injury = {type: "Healthy", gamesRemaining: 0};
                            } else {
                                p.injury.gamesRemaining -= 15;
                            }
                            update = true;
                        }

                        // Update player in DB, if necessary
                        if (update) {
                            return p;
                        }
                    });
                }
            });

        }).then(function () {
            // Remove released players' salaries from payrolls if their contract expired this year
            return dao.releasedPlayers.iterate({
                ot: tx,
                index: "contract.exp",
                key: IDBKeyRange.upperBound(g.season),
                callback: function (rp) {
                    dao.releasedPlayers.delete({
                        ot: tx,
                        key: rp.rid
                    });
                }
            });

        }).then(function () {
            return team.updateStrategies(tx);
        }).then(function () {
            return season.updateOwnerMood(tx);
        }).then(function (deltas) {
            return message.generate(tx, deltas);
        }).then(function () {
            var url;						       

           // Don't redirect if we're viewing a live game now
            if (location.pathname.indexOf("/live_game") === -1) {
                url = helpers.leagueUrl(["history"]);
            }

            helpers.bbgmPing("season");

            return [url, ["playerMovement"]];
        });
       });					
    }					
			
      /*          // Don't redirect if we're viewing a live game now
                if (location.pathname.indexOf("/live_game") === -1) {
                    url = helpers.leagueUrl(["history"]);
                }

                return newPhaseFinalize(g.PHASE.BEFORE_DRAFT, url, ["playerMovement"]);
            }).then(function () {
                helpers.bbgmPing("season");
            });
        });
    }*/

    function newPhaseDraft(tx) {
		
      // Achievements after playoffs
    //    account.checkAchievement.fo_fo_fo();
    //    account.checkAchievement["98_degrees"]();
    //    account.checkAchievement.dynasty();
    //    account.checkAchievement.dynasty_2();
    //    account.checkAchievement.dynasty_3();
    //    account.checkAchievement.moneyball();
    //    account.checkAchievement.moneyball_2();
    //    account.checkAchievement.small_market();
		// Achievements after awards
			
		
         return draft.genOrder(tx).then(function () {
            // This is a hack to handle weird cases where players have draft.year set to the current season, which fucks up the draft UI
            return dao.players.iterate({
                ot: tx,
                index: "draft.year",
                key: g.season,
                callback: function (p) {
                    if (p.tid >= 0) {
                        p.draft.year -= 1;
                        return p;
                    }
                }
            });
        }).then(function () {
            return [helpers.leagueUrl(["draft"])];
        });
    }
    function newPhaseAfterDraft(tx) {
        var promises, round, tid;
		console.log("does the game even get here?");
        promises = [];

        // Add a new set of draft picks
        for (tid = 0; tid < g.numTeams; tid++) {
            for (round = 1; round <= 2; round++) {
                promises.push(dao.draftPicks.add({
                    ot: tx,
                    value: {
                        tid: tid,
                        originalTid: tid,
                        round: round,
                        season: g.season + 4
                    }
                }));
            }
        }

        return Promise.all(promises).then(function () {
            return [undefined, ["playerMovement"]];
        });
    }

    function newPhaseResignPlayers(tx) {
		
		
		
		console.log("does the game even get here?");		
        return player.genBaseMoods(tx).then(function (baseMoods) {
             // Re-sign players on user's team
            return dao.players.iterate({
                ot: tx,
                index: "tid",
                key: IDBKeyRange.lowerBound(0),
                callback: function (p) {
					var tid;					
                    if (p.contract.exp <= g.season && g.userTids.indexOf(p.tid) >= 0 && g.autoPlaySeasons === 0) {

                        tid = p.tid;
                        // Add to free agents first, to generate a contract demand
                        return player.addToFreeAgents(tx, p, g.PHASE.RESIGN_PLAYERS, baseMoods).then(function () {
                            // Open negotiations with player
                            return contractNegotiation.create(tx, p.pid, true, tid).then(function (error) {
                                if (error !== undefined && error) {
                                    eventLog.add(null, {
                                        type: "refuseToSign",
                                        text: error,
                                        pids: [p.pid],
                                        tids: [tid]
                                    });
                                }
                            });
                        });
                    }
                }
            });
        }).then(function () {
            // Set daysLeft here because this is "basically" free agency, so some functions based on daysLeft need to treat it that way (such as the trade AI being more reluctant)
            return require("core/league").setGameAttributes(tx, {daysLeft: 30});
        }).then(function () {
            return [helpers.leagueUrl(["negotiation"]), ["playerMovement"]];
        });
    }

 	

    function newPhaseFreeAgency(tx) {
        var strategies,hype;

		//console.log("GOT HERE");
        return team.filter({
            ot: tx,			
            attrs: ["strategy"],
			seasonAttrs: ["hype"],
            season: g.season
        }).then(function (teams) {
            strategies = _.pluck(teams, "strategy");
            hype = _.pluck(teams, "hype");
			
            // Delete all current negotiations to resign players
            return contractNegotiation.cancelAll(tx);
        }).then(function () {
            /*var tx;
		console.log("GOT HERE");			
            phaseChangeTx = dao.tx(["players", "teams","champions","championPatch"], "readwrite");
		console.log("GOT HERE");
            player.genBaseMoods(tx).then(function (baseMoods) {*/
            return player.genBaseMoods(tx).then(function (baseMoods) {				
                // Reset contract demands of current free agents and undrafted players
                return dao.players.iterate({
                    ot: tx,
                    index: "tid",
                    key: IDBKeyRange.bound(g.PLAYER.UNDRAFTED, g.PLAYER.FREE_AGENT), // This only works because g.PLAYER.UNDRAFTED is -2 and g.PLAYER.FREE_AGENT is -1
                    callback: function (p) {
                        return player.addToFreeAgents(tx, p, g.PHASE.FREE_AGENCY, baseMoods);
                    }
                }).then(function () {
                    // AI teams re-sign players or they become free agents
                    // Run this after upding contracts for current free agents, or addToFreeAgents will be called twice for these guys
                    return dao.players.iterate({
                        ot: tx,
                        index: "tid",
                        key: IDBKeyRange.lowerBound(0),
                        callback: function (p) {
                            var contract, factor;

                            if (p.contract.exp <= g.season && (g.userTids.indexOf(p.tid) < 0 || g.autoPlaySeasons > 0)) {
                                // Automatically negotiate with teams
                               /* if (strategies[p.tid] === "rebuilding") {
                                    factor = 0.4;
                                } else {*/
                                    factor = 0;
                                //}
								
								// too harsh? , prevent really good players from resigning with bad teams
								// only the 100k+ players?
								if ((p.value / 100) > (hype[p.tid]*.3+.7)) {
								   factor = 1.00;
								 //  factor = 1.00-hype[p.tid];
								}
								if ((p.value / 100) < (hype[p.tid]*.3+.5)) {
//								   factor = 1.00-hype[p.tid];
								}
								
								// use payroll here?
								
//                                if (Math.random() < p.value / 100 - factor) { // Should eventually be smarter than a coin flip
                                if (Math.random() < p.value / 100 - factor) { // Should eventually be smarter than a coin flip
								// See also core.team
                                    contract = player.genContract(p);
                                    contract.exp += 1; // Otherwise contracts could expire this season
                                    p = player.setContract(p, contract, true);
                                    p.gamesUntilTradable = 4;
                                    eventLog.add(null, {
                                        type: "reSigned",
                                        text: '<a href="' + helpers.leagueUrl(["roster", g.teamAbbrevsCache[p.tid], g.season]) + '">' + g.teamRegionsCache[p.tid] + '</a> re-signed <a href="' + helpers.leagueUrl(["player", p.pid]) + '">' + p.name + '</a> for ' + helpers.formatCurrency(p.contract.amount, "K") + '/year through ' + p.contract.exp + '.',
                                        showNotification: false,
                                        pids: [p.pid],
                                        tids: [p.tid]
                                    });									
                                    return p; // Other endpoints include calls to addToFreeAgents, which handles updating the database
                                }

                                return player.addToFreeAgents(tx, p, g.PHASE.RESIGN_PLAYERS, baseMoods);
                            }
                        }
                    });
                });
            }).then(function () {
                // Bump up future draft classes (nested so tid updates don't cause race conditions)
                dao.players.iterate({
                    ot: tx,
                    index: "tid",
                    key: g.PLAYER.UNDRAFTED_2,
                    callback: function (p) {
                        p.tid = g.PLAYER.UNDRAFTED;
                        p.ratings[0].fuzz /= 2;
                        return p;
                    }
                }).then(function () {
                    dao.players.iterate({
                        ot: tx,
                        index: "tid",
                        key: g.PLAYER.UNDRAFTED_3,
                        callback: function (p) {
                            p.tid = g.PLAYER.UNDRAFTED_2;
                            p.ratings[0].fuzz /= 2;
                            return p;
                        }
                    });
                });
 //           });

//            return tx.complete().then(function () {
            }).then(function () {
 //           return tx.complete().then(function () {
                // Create new draft class for 3 years in the future
                //return draft.genPlayers(null, g.PLAYER.UNDRAFTED_3);
//				return dao.champions.getAll({ot: ot}),
	//	console.log("GOT HERE");
				return dao.champions.getAll({
							ot: tx
						}).then(function (c) {
								console.log("GOT HERE");
							return dao.championPatch.getAll({
										ot: tx
									}).then(function (cp) {
											console.log("GOT HERE");
									
									//console.log(c.length);
									//console.log(cp.length);
								//	console.log(_.size(c));
								//	console.log(_.size(cpSorted));
									
										var i,j;
										var cpSorted;
										var topADC,topMID,topJGL,topTOP,topSUP;
										
										cpSorted = [];
										
										for (i = 0; i < _.size(cp); i++) {
											cpSorted.push({"champion": cp[i].champion,"cpid": cp[i].cpid,"rank": cp[i].rank,"role": cp[i].role});
										}					
										
										cpSorted.sort(function (a, b) { return a.rank - b.rank; });		
										

										topADC = [];
										topMID = [];
										topJGL = [];
										topTOP = [];
										topSUP = [];

										for (i = 0; i < _.size(cpSorted); i++) {
											if ((cpSorted[i].role == "ADC") && (topADC.length < 5) ) {
										//	   console.log(_.size(c));
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topADC.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Middle") && (topMID.length < 5) ) {
							//				  topMID.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topMID.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Jungle") && (topJGL.length < 5) ) {
							//				  topJGL.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topJGL.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Top") && (topTOP.length < 5) ) {
							//				  topTOP.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topTOP.push(c[j].hid);
														j = _.size(c);
													}
												}
											}
											if ((cpSorted[i].role == "Support") && (topSUP.length < 5) ) {
							//				  topSUP.push(cpSorted[i].cpid);
												for (j = 0; j < _.size(c); j++) {
													if (c[j].name == cpSorted[i].champion) {
														topSUP.push(c[j].hid);
														j = _.size(c);
													}
												}

											}
										
										}											
									
									
								//	console.log(topADC);
								//	console.log(topMID);
								//	console.log(topJGL);
								//	console.log(topTOP);
								//	console.log(topSUP);									
										return draft.genPlayers(tx, g.PLAYER.UNDRAFTED_3,null,null,c,topADC,topMID,topJGL,topTOP,topSUP);
							
							
/*							return draft.genPlayers(null, g.PLAYER.UNDRAFTED_3,null,null,t).then(function() {
							});						*/
									});							
						});							
					/*return team.filter({
			//				ot: tx,					
							attrs: ["tid","city","state","longitude","latitude"],
							seasonAttrs: ["pop"],
							season: g.season
					}).then(function (t) {	
						return draft.genPlayers(null, g.PLAYER.UNDRAFTED_3,null,null,t).then(function() {
				
				
					
				
						});
				
					});					*/
            }).then(function () {				
				
          //  return tx.complete().then(function () {				
 //           }).then(function () {
                //return newPhaseFinalize(g.PHASE.FREE_AGENCY, helpers.leagueUrl(["free_agents"]), ["playerMovement"]);
				return [helpers.leagueUrl(["free_agents"]), ["playerMovement"]];
            });
        });
    }

    function newPhaseFantasyDraft(tx, position) {
        return contractNegotiation.cancelAll(tx).then(function () {
            return draft.genOrderFantasy(tx, position);
        }).then(function () {
            return require("core/league").setGameAttributes(tx, {nextPhase: g.phase});
        }).then(function () {
            // Protect draft prospects from being included in this
            return dao.players.iterate({
                ot: tx,
                index: "tid",
                key: g.PLAYER.UNDRAFTED,
                callback: function (p) {
                    p.tid = g.PLAYER.UNDRAFTED_FANTASY_TEMP;
                    return p;
                }
            }).then(function () {
                // Make all players draftable
                dao.players.iterate({
                    ot: tx,
                    index: "tid",
                    key: IDBKeyRange.lowerBound(g.PLAYER.FREE_AGENT),
                    callback: function (p) {
                        p.tid = g.PLAYER.UNDRAFTED;
                        return p;
                    }
                });
            });

        }).then(function () {
            return dao.releasedPlayers.clear({ot: tx});
        }).then(function () {
            return [helpers.leagueUrl(["draft"]), ["playerMovement"]];
        });
    }


    /**
     * Set a new phase of the game.
     *
     * This function is called to do all the crap that must be done during transitions between phases of the game, such as moving from the regular season to the playoffs. Phases are defined in the g.PHASE.* global variables. The phase update may happen asynchronously if the database must be accessed, so do not rely on g.phase being updated immediately after this function is called. Instead, pass a callback.
     *
     * phaseChangeTx contains the transaction for the phase change. Phase changes are atomic: if there is an error, it all gets cancelled. The user can also manually abort the phase change. IMPORTANT: For this reason, gameAttributes must be included in every phaseChangeTx to prevent g.phaseChangeInProgress from being changed. Since phaseChangeTx is readwrite, nothing else will be able to touch phaseChangeInProgress until it finishes.
     *
     * @memberOf core.phase
     * @param {number} phase Numeric phase ID. This should always be one of the g.PHASE.* variables defined in globals.js.
     * @param {} extra Parameter containing extra info to be passed to phase changing function. Currently only used for newPhaseFantasyDraft.
     * @return {Promise}
     */
    function newPhase(phase, extra) {
        // Prevent at least some cases of code running twice
	//	console.log(phase+" "+g.phase);
        if (phase === g.phase) {
            return;
        }
	//	console.log(phase+" "+g.phase);
        return lock.phaseChangeInProgress().then(function (phaseChangeInProgress) {
            if (!phaseChangeInProgress) {
                return require("core/league").setGameAttributesComplete({phaseChangeInProgress: true}).then(function () {
                    ui.updatePlayMenu(null);
					
                    // In Chrome, this will update play menu in other windows. In Firefox, it won't because ui.updatePlayMenu gets blocked until phaseChangeTx finishes for some reason.
                    require("core/league").updateLastDbChange();					
					
					
					if (phase === g.PHASE.PRESEASON) {
						phaseChangeTx = dao.tx(["gameAttributes", "players", "playerStats", "releasedPlayers", "teams","champions","championPatch"], "readwrite");
						return newPhasePreseason(phaseChangeTx);
					}
					if (phase === g.PHASE.REGULAR_SEASON) {
	//					phaseChangeTx = dao.tx(["gameAttributes", "messages", "schedule"], "readwrite");
						phaseChangeTx = dao.tx(["gameAttributes", "messages", "schedule","teams"], "readwrite");
						return newPhaseRegularSeason(phaseChangeTx);
					}
					if (phase === g.PHASE.AFTER_TRADE_DEADLINE) {
						return newPhaseAfterTradeDeadline();
					}
					if (phase === g.PHASE.PLAYOFFS) {
						phaseChangeTx = dao.tx(["players", "playerStats", "playoffSeries", "releasedPlayers", "schedule", "teams"], "readwrite");
						return newPhasePlayoffs(phaseChangeTx);
					}
					if (phase === g.PHASE.BEFORE_DRAFT) {
						phaseChangeTx = dao.tx(["awards", "events", "gameAttributes", "messages", "players", "playerStats", "releasedPlayers", "teams","championPatch"], "readwrite");
						return newPhaseBeforeDraft(phaseChangeTx);
					}
					if (phase === g.PHASE.DRAFT) {
						phaseChangeTx = dao.tx(["draftPicks", "draftOrder", "gameAttributes", "players", "teams"], "readwrite");
						return newPhaseDraft(phaseChangeTx);
					}
					if (phase === g.PHASE.AFTER_DRAFT) {
						phaseChangeTx = dao.tx(["draftPicks", "gameAttributes"], "readwrite");
						return newPhaseAfterDraft(phaseChangeTx);
					}
					if (phase === g.PHASE.RESIGN_PLAYERS) {
						phaseChangeTx = dao.tx(["gameAttributes", "messages", "negotiations", "players", "teams"], "readwrite");
						return newPhaseResignPlayers(phaseChangeTx);
					}
					if (phase === g.PHASE.FREE_AGENCY) {
						phaseChangeTx = dao.tx(["gameAttributes", "messages", "negotiations", "players", "teams","champions","championPatch"], "readwrite");
						return newPhaseFreeAgency(phaseChangeTx);
					}
					if (phase === g.PHASE.FANTASY_DRAFT) {
						phaseChangeTx = dao.tx(["draftOrder", "gameAttributes", "messages", "negotiations", "players", "releasedPlayers"], "readwrite");
						return newPhaseFantasyDraft(phaseChangeTx, extra);
					}
                }).catch(function (err) {
                    // If there was any error in the phase change, abort transaction
					console.log(err);
                    if (phaseChangeTx && phaseChangeTx.abort) {
                        phaseChangeTx.abort();
                    }

                    require("core/league").setGameAttributesComplete({phaseChangeInProgress: false}).then(function () {
                        throw err;
                    });
                }).spread(function (url, updateEvents) {
                 //   return phaseChangeTx.complete().then(function () {
                        return finalize(phase, url, updateEvents);
                //    });
                });
            }

            helpers.errorNotify("Phase change already in progress, maybe in another tab.");
        });
    }

    function abort() {
		console.log("got here");
        try {
            // Stop error from bubbling up, since this function is only called on purpose
            phaseChangeTx.onerror = function (e) {
                e.stopPropagation();
                e.preventDefault();
            };

            phaseChangeTx.abort();
        } catch (err) {
            // Could be here because tx already ended, phase change is happening in another tab, or something weird.
            console.log("This is probably not actually an error:");
            console.log(err.stack);
            helpers.errorNotify("If \"Abort\" doesn't work, check if you have another tab open.");
        } finally {
            // If another window has a phase change in progress, this won't do anything until that finishes
            require("core/league").setGameAttributesComplete({phaseChangeInProgress: false}).then(function () {
                return ui.updatePlayMenu(null);
            });
        }
    }

    return {
        newPhase: newPhase,
        abort: abort
    };
});