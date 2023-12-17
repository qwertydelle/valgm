/**
 * @name core.gameSim
 * @namespace Individual game simulation.
 */
define(["lib/underscore", "util/helpers", "util/random", "globals", "data/weapons"], function (_, helpers, random, g, weapons) {
    "use strict";

	
    /**
     * Initialize the two teams that are playing this game.
     *
     * When an instance of this class is created, information about the two teams is passed to GameSim. Then GameSim.run will actually simulate a game and return the results (i.e. stats) of the simulation. Also see core.game where the inputs to this function are generated.
     *
     * @memberOf core.gameSim
     * @param {number} gid Integer game ID, which must be unique as it will serve as the primary key in the database when the game is saved.
     * @param {Object} team1 Information about the home team. Top-level properties are: id (team ID number), defense (a number representing the overall team defensive rating), pace (the mean number of possessions the team likes to have in a game), stat (an for storing team stats), and player (a list of objects, one for each player on the team, ordered by rosterOrder). Each player's object contains: id (player's unique ID number), valueNoPot (current player value, from core.player.value), stat (an object for storing player stats, similar to the one for team stats), and compositeRatings (an object containing various ratings used in the game simulation), and skills (a list of discrete skills a player has, as defined in core.player.skills, which influence game simulation). In other words...
     *     {
     *         "id": 0,
     *         "defense": 0,
     *         "pace": 0,
     *         "stat": {},
     *         "player": [
     *             {
     *                 "id": 0,
     *                 "valueNoPot": 0,
     *                 "stat": {},
     *                 "compositeRating": {},
     *                 "skills": [],
     *                 "injured": false,
     *                 "ptMultiplier": 1
     *             },
     *             ...
     *         ]
     *     }
     * @param {Object} team2 Same as team1, but for the away team.
     */


    var weaponsData = weapons.weapons;
    function GameSim(gid, team1, team2, doPlayByPlay) {
		//Index 0 is home team, Index 1 is away team
		if(doPlayByPlay) {
			this.playByPlay = []
		}
		this.id = gid;
		this.teams = [team1,team2]
		//First Index for team 1, Second index for team 2
		this.playerAgentPicks = [{},{}]
        this.currentWeapon = [{},{}]

        for(let teamID = 0;teamID < 2;teamID++) {

            this.teams[teamID].sortedPlayers = this.teams[teamID].player.slice(0,5).concat().sort(function(a,b) {
                if(a.ovr > b.ovr) {
                    return -1;
                } else if(b.ovr > a.ovr) {
                    return 1;
                } else {
                    return 0;
                }
            })

            this.teams[teamID].sortedIDs = [this.teams[teamID].player.findIndex((function(e) { return e.id == this.teams[teamID].sortedPlayers[0].id}).bind(this)),this.teams[teamID].player.findIndex((function(e) { return e.id == this.teams[teamID].sortedPlayers[1].id}).bind(this))]
        }


        //Give whole team 10% of top players ability 
        for(let teamID = 0;teamID < 2;teamID++) {

            //Every player gets a certain percentage of the best players skill
            let Percent = this.teams[teamID].sortedPlayers[0].ovr * (Math.random() * 0.15);

            console.log(this.teams[teamID])

            for(let i = 0;i < 5;i++) {
                if(this.teams[teamID].sortedPlayers[0].id != this.teams[teamID].player[i].id) {
                    this.teams[teamID].player[i].matchRating.aim += Percent
                    this.teams[teamID].player[i].matchRating.utilUsage += Percent
                    this.teams[teamID].player[i].matchRating.teamwork += Percent
                }
            }
        }

		this.agentPicks();
        

        console.log(this.teams)
        //Check for positions
        for(let i = 0; i < 2;i++) {
            for(let j = 0; j < 5;j++) {

                //If all positions are filled reb should be 40

                if(j === 0) {
                    if(this.teams[i].player[j].pos === "Duelist") {
                        this.teams[i].synergy.reb += 10;
                    }
                } else if(j === 1) {
                    if(this.teams[i].player[j].pos === "Initiator") {
                        this.teams[i].synergy.reb += 10;
                    }
                } else if(j === 2) {
                    if(this.teams[i].player[j].pos === "Smokes") {
                        this.teams[i].synergy.reb += 10;
                    }
                } else if(j === 3) {
                    if(this.teams[i].player[j].pos === "Sentinal") {
                        this.teams[i].synergy.reb += 10;
                    }
                } else {
                    if(this.teams[i].player[j].pos === "Duelist" || this.teams[i].player[j].pos === "Initiator") {
                        this.teams[i].synergy.off += 10;
                    } else if(this.teams[i].player[j].pos === "Smokes" || this.teams[i].player[j].pos === "Sentinal") {
                        this.teams[i].synergy.def += 10;
                    }
                }
            }
        }

        // for(let i = 0; i < 2; i++) {
        //     for(let j = 0; j < 5;i++) {
                
        //     }
        // }
	}
	
	/**
     * Simulates the game and returns the results.
     *
     * Also see core.game where the outputs of this function are used.
     *
     * @memberOf core.gameSim
     * @return {Array.<Object>} Game result object, an array of two objects similar to the inputs to GameSim, but with both the team and player "stat" objects filled in and the extraneous data (pace, valueNoPot, compositeRating) removed. In other words...
     *     {
     *         "gid": 0,
     *         "overtimes": 0,
     *         "team": [
     *             {
     *                 "id": 0,
     *                 "stat": {},
     *                 "player": [
     *                     {
     *                         "id": 0,
     *                         "stat": {},
     *                         "skills": [],
     *                         "injured": false
     *                     },
     *                     ...
     *                 ]
     *             },
     *         ...
     *         ]
     *     }
     */
    GameSim.prototype.run = function () {
        var out;
        var roundCounter = 1;


        //Pick main gun a player is going to be using throughout the game
        for(let i = 0; i < 2; i++) {
            for(let j = 0; j < 5; j++) {
                let choiceRifles = ["Vandal", "Phantom"];
                let choice  = Math.floor(Math.random() * 2);

                //Add probablity of picking one gun over the other based on role and aim stat
                this.teams[i].player[j].mainGun = choiceRifles[choice];

                //Updating games player played min stat does not matter
                this.recordStat(i, j, "min", 100);
                this.recordStat(i, j, "gs");
            }

        }

        let attackFirst = Math.floor(Math.random())
        this.simRound(roundCounter, attackFirst);


        out = {
            gid: this.id,
            overtimes: 0,
            team: this.teams
        }




        return out;
    };


    GameSim.prototype.simRound = function(roundCounter, teamId, creditsData) {
        creditsData = creditsData === undefined? [[800,800,800,800,800],[800,800,800,800,800]]: creditsData;
        let basicActions = ["peek", "hold", "fight", "fight", "fight", "utilPeek", "utilPeek", "utilTeamFight"];
        let deadPlayers = [[],[]];
        let enemyTeamID = teamId == 1? 0: 1;

        let plantedSpike = false;
        let spikeTimer = 0;
        let normalTimer = 0;

        this.manageBuys(creditsData)

        console.log(this.teams)

        //Rounds 
        /*For Later 
            change so topFrags have impact
            Example: If top frag kills someone then spike getting planted is 100% 
        */
        if(this.teams[teamId].stat.pts < 13 && this.teams[enemyTeamID].stat.pts < 13) {
            //Shuffle Player Id
            let randomPlayerChoices = [0,1,2,3,4, this.teams[teamId].sortedIDs[0],this.teams[teamId].sortedIDs[0], this.teams[teamId].sortedIDs[1]]
            let randomPlayerPick = Math.floor(Math.random() * randomPlayerChoices.length)


            randomPlayerPick = randomPlayerChoices[randomPlayerPick];


            let currentPlayer = { 
                player: this.teams[teamId].player[randomPlayerPick],
                agent: this.playerAgentPicks[teamId][randomPlayerPick]
            };

            let randomEnemyPick = Math.floor(Math.random() * 5);

            let enemyPlayer = {
                player: this.teams[enemyTeamID].player[randomEnemyPick],
                agent: this.playerAgentPicks[enemyTeamID][randomEnemyPick]
            }

            console.log(currentPlayer)
            console.log(enemyPlayer)

            for(let i = 0; i < 5; i++) {
                let randomBasicAction = Math.floor(Math.random() * basicActions.length);


                if((plantedSpike && spikeTimer >= 75) || (deadPlayers[1].length == 5)) {
                    roundCounter += 1;
                    this.teams[teamId].stat.pts += 1;

                    for(let i = 0; i < 5; i++) {
                        creditsData[teamId][i] += 3000;
                    }

                    for(let i = 0; i < 5; i++) {
                        creditsData[enemyTeamID][i] += 1600;
                    }

                    break;
                } else if((normalTimer >= 175) || (deadPlayers[0].length == 5)) {
                    roundCounter += 1;
                    this.teams[enemyTeamID].stat.pts += 1;

                    for(let i = 0; i < 5; i++) {
                        creditsData[enemyTeamID][i] += 3000;
                    }

                    for(let i = 0; i < 5; i++) {
                        creditsData[teamId][i] += 1600;
                    }

                    break;
                }

                //Check if player is dead
                if(!deadPlayers[teamId].includes(randomPlayerPick) && !deadPlayers[enemyTeamID].includes(randomEnemyPick)) {

                    //If chosen players peeks an angle
                    if(basicActions[randomBasicAction] == "peek") {
                        let boost = 0;
                        let enemyBoost = 0;
    
                        //Make the boosts random later on
                        if((currentPlayer.player.pos == "Duelist" && currentPlayer.agent.role == "Duelist") || (currentPlayer.player.pos == "Initiator" && currentPlayer.agent.role == "Initiator")) {
                            boost += Math.floor(Math.random() * 5);
                        }
    
                        if((enemyPlayer.player.pos == "Duelist" && enemyPlayer.agent.role == "Duelist") || (enemyPlayer.player.pos == "Initiator" && enemyPlayer.agent.role == "Initiator")) {
                            enemyBoost += Math.floor(Math.random() * 5);
                        }

                        //Adding overall synergy boosts
                        boost += (this.teams[teamId].synergy.off + this.teams[teamId].synergy.reb); 
                        enemyBoost += (this.teams[enemyTeamID].synergy.def + this.teams[enemyTeamID].synergy.reb); 


                        //Most pro players rarely ever have 0 kills a game this is to counter some players being plain horrible
                        if(Math.random() > 0.66) {
                            if(Math.random() > 0.5) {
                                boost += 200;
                            } else {
                                enemyBoost += 200;
                            }
                        }
    
    
                        if(Math.random() > 0.3) {
                            
                            if(currentPlayer.player.compositeRating.dribbing + boost > enemyPlayer.player.compositeRating.dribbing + enemyBoost) {
                                if(Math.random() > 0.5) {
                                    if(this.currentWeapon[teamId][randomPlayerPick].value > this.currentWeapon[enemyTeamID][randomEnemyPick].value) {
                                        this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                        deadPlayers[enemyTeamID].push(randomEnemyPick);
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                                        creditsData[teamId][randomPlayerPick] += 200;

                                        if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                            plantedSpike = true;
                                        }            
                                    } else {
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                        deadPlayers[teamId].push(randomPlayerPick)
                                        this.recordStat(teamId, randomPlayerPick, "fga", 1)

                                        creditsData[enemyTeamID][randomEnemyPick] += 200;

                                        if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                            plantedSpike = false;
                                            normalTimer = 175;
                                        }    
                                    }
                                } else {
                                    this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                    deadPlayers[enemyTeamID].push(randomEnemyPick);
                                    this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                                    creditsData[teamId][randomPlayerPick] += 200;

                                    if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                        plantedSpike = true;
                                    }        
                                }
                            } else {
                                this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                deadPlayers[teamId].push(randomPlayerPick);
                                this.recordStat(teamId, randomPlayerPick, "fga", 1)

                                creditsData[enemyTeamID][randomEnemyPick] += 200;

                                if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                    plantedSpike = false;
                                    normalTimer = 175;
                                }    
                            }


                        } else if(Math.random() > 0.85) {
                            //Just kill the enemy
                            this.recordStat(teamId, randomPlayerPick, "fg", 1);
                            deadPlayers[enemyTeamID].push(randomEnemyPick);
                            this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                            creditsData[teamId][randomPlayerPick] += 200;

                            if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                plantedSpike = true;
                            }

                        } else {
                            if(currentPlayer.player.matchRating.aim + boost > enemyPlayer.player.matchRating.aim + enemyBoost) {
                                this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                deadPlayers[enemyTeamID].push(randomEnemyPick);
                                this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                                creditsData[teamId][randomPlayerPick] += 200;

                                if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                    plantedSpike = true;
                                } 
                            } else {
                                this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                deadPlayers[teamId].push(randomPlayerPick)
                                this.recordStat(teamId, randomPlayerPick, "fga", 1)

                                creditsData[enemyTeamID][randomEnemyPick] += 200;

                                if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                    plantedSpike = false;
                                    normalTimer = 175;
                                }    
                            }
                        }
                    
                    //If chosen player holds an angle
                    } else if(basicActions[randomBasicAction] == "hold") {
                        let boost = 0;
                        let enemyBoost = 0;
    
                        //Make the boosts random later on
                        if((currentPlayer.player.pos == "Sentinal" && currentPlayer.agent.role == "Sentinal") || (currentPlayer.player.pos == "Smokes" && currentPlayer.agent.role == "Smokes")) {
                            boost += Math.floor(Math.random() * 5);
                        }
    
                        if((enemyPlayer.player.pos == "Sentinal" && enemyPlayer.agent.role == "Sentinal") || (enemyPlayer.player.pos == "Smokes" && enemyPlayer.agent.role == "Smokes")) {
                            enemyBoost += Math.floor(Math.random() * 5) - 0.5;
                        }

                        //Adding overall synergy boosts
                        boost += (this.teams[teamId].synergy.def + this.teams[teamId].synergy.reb); 
                        enemyBoost += (this.teams[enemyTeamID].synergy.off + this.teams[enemyTeamID].synergy.reb); 
                        
                        if(Math.random() > 0.66) {
                            if(Math.random() > 0.5) {
                                boost += 200;
                            } else {
                                enemyBoost += 200;
                            }
                        }
    

                        if(Math.random() > 0.4) {
                            if(currentPlayer.player.matchRating.aim + boost > enemyPlayer.player.matchRating.aim + enemyBoost) {
                                if(Math.random() > 0.5) {
                                    if(this.currentWeapon[teamId][randomPlayerPick].value > this.currentWeapon[enemyTeamID][randomEnemyPick].value) {
                                        this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                        deadPlayers[enemyTeamID].push(randomEnemyPick);
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)
    
                                        creditsData[teamId][randomPlayerPick] += 200;
    
                                        if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                            plantedSpike = true;
                                        }            
                                    } else {
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                        deadPlayers[teamId].push(randomPlayerPick)
                                        this.recordStat(teamId, randomPlayerPick, "fga", 1)
    
                                        creditsData[enemyTeamID][randomEnemyPick] += 200;
    
                                        if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                            plantedSpike = false;
                                            normalTimer = 175;
                                        }    
                                    }
                                } else {
                                    this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                    deadPlayers[enemyTeamID].push(randomEnemyPick);
                                    this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)
    
                                    creditsData[teamId][randomPlayerPick] += 200;
    
                                    if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                        plantedSpike = true;
                                    }        
                                }
                            } else {
                                this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                deadPlayers[teamId].push(randomPlayerPick);
                                this.recordStat(teamId, randomPlayerPick, "fga", 1)
    
                                //Assist for random player
                                this.recordStat(enemyTeamID, randomEnemyPick + 1, "fgp", 1);
                                creditsData[enemyTeamID][randomEnemyPick] += 200;
    
                                //Defuse spike
                                if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                    plantedSpike = false;
                                    normalTimer = 175;
                                }    
                            }
                        } else {
                            if(currentPlayer.player.matchRating.utilUsage + boost > enemyPlayer.player.matchRating.utilUsage + enemyBoost) {
                                if(Math.random() > 0.5) {
                                    if(this.currentWeapon[teamId][randomPlayerPick].value > this.currentWeapon[enemyTeamID][randomEnemyPick].value) {
                                        this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                        deadPlayers[enemyTeamID].push(randomEnemyPick);
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)
    
                                        creditsData[teamId][randomPlayerPick] += 200;
    
                                        if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                            plantedSpike = true;
                                        }            
                                    } else {
                                        this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                        deadPlayers[teamId].push(randomPlayerPick)
                                        this.recordStat(teamId, randomPlayerPick, "fga", 1)
    
                                        creditsData[enemyTeamID][randomEnemyPick] += 200;
    
                                        if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                            plantedSpike = false;
                                            normalTimer = 175;
                                        }    
                                    }
                                } else {
                                    this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                    deadPlayers[enemyTeamID].push(randomEnemyPick);
                                    this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)
    
                                    creditsData[teamId][randomPlayerPick] += 200;
    
                                    if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                        plantedSpike = true;
                                    }        
                                }
                            } else {
                                //Kill
                                this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                deadPlayers[teamId].push(randomPlayerPick);
                                this.recordStat(teamId, randomPlayerPick, "fga", 1)
    
                                //Assist for random player
                                this.recordStat(enemyTeamID, randomEnemyPick + 1, "fgp", 1);
                                creditsData[enemyTeamID][randomEnemyPick] += 200;
    
                                //Defuse spike
                                if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                    plantedSpike = false;
                                    normalTimer = 175;
                                }    
                            }
                        }

                    } else if(basicActions[randomBasicAction] == "fight") {
                        let boost = 0;
                        let enemyBoost = 0;
    
                        //Make the boosts random later on
                        if(currentPlayer.player.pos == "Duelist" && currentPlayer.agent.role == "Duelist") {
                            boost += Math.floor(Math.random() * 5);
                        }
    
                        if(enemyPlayer.player.pos == "Duelist" && enemyPlayer.agent.role == "Duelist") {
                            enemyBoost += Math.floor(Math.random() * 5);
                        }

                        if(Math.random() > 0.66) {
                            if(Math.random() > 0.5) {
                                boost += 200;
                            } else {
                                enemyBoost += 200;
                            }
                        }

                        //Adding overall synergy boosts
                        boost += (this.teams[teamId].synergy.off + this.teams[teamId].synergy.reb); 
                        enemyBoost += (this.teams[enemyTeamID].synergy.off + this.teams[enemyTeamID].synergy.reb); 
    
                        
                        //Fighting the enemy
                        if(currentPlayer.player.matchRating.aim + boost > enemyPlayer.player.matchRating.aim + enemyBoost) {
                            if(Math.random() > 0.5) {
                                if(this.currentWeapon[teamId][randomPlayerPick].value >= this.currentWeapon[enemyTeamID][randomEnemyPick].value) {
                                    this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                    deadPlayers[enemyTeamID].push(randomEnemyPick);
                                    this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                                    creditsData[teamId][randomPlayerPick] += 200;

                                    if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                        plantedSpike = true;
                                    }        
                                } else {
                                    this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                                    deadPlayers[teamId].push(randomPlayerPick)
                                    this.recordStat(teamId, randomPlayerPick, "fga", 1)

                                    creditsData[enemyTeamID][randomEnemyPick] += 200;

                                    if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8) && (plantedSpike))) {
                                        plantedSpike = false;
                                        normalTimer = 175;
                                    }    
                                }
                            } else {
                                this.recordStat(teamId, randomPlayerPick, "fg", 1);
                                deadPlayers[enemyTeamID].push(randomEnemyPick);
                                this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                                creditsData[teamId][randomPlayerPick] += 200;

                                if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                    plantedSpike = true;
                                }    
                            }
                        } else {
                            this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                            deadPlayers[teamId].push(randomPlayerPick);
                            this.recordStat(teamId, randomPlayerPick, "fga", 1)

                            creditsData[enemyTeamID][randomEnemyPick] += 200;

                            if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                plantedSpike = false;
                                normalTimer = 175;
                            }    
                        }
                    } else if(basicActions[randomBasicAction] == "utilPeek") {
                        if(currentPlayer.player.matchRating.utilUsage + currentPlayer.agent.ratings.ability  > enemyPlayer.player.matchRating.utilUsage + currentPlayer.agent.ratings.ability) {
                            this.recordStat(teamId, randomPlayerPick, "fg", 1);
                            deadPlayers[enemyTeamID].push(randomEnemyPick);
                            this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                            creditsData[teamId][randomPlayerPick] += 200;

                            if(enemyPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) {
                                plantedSpike = true;
                            } 
                        } else {
                            this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                            deadPlayers[teamId].push(randomPlayerPick);
                            this.recordStat(teamId, randomPlayerPick, "fga", 1)

                            creditsData[enemyTeamID][randomEnemyPick] += 200;

                            if((currentPlayer.agent.role === "Sentinal" || (Math.random() > 0.8)) && (plantedSpike)) {
                                plantedSpike = false;
                                normalTimer = 175;
                            } 
                        }
                    } else if(basicActions[randomBasicAction] == "utilTeamFight") {
                        if(currentPlayer.player.matchRating.teamwork + currentPlayer.agent.ratings.ability > enemyPlayer.player.matchRating.teamwork + currentPlayer.agent.ratings.ability) {
                            this.recordStat(teamId, randomPlayerPick, "fg", 1);
                            deadPlayers[enemyTeamID].push(randomEnemyPick);
                            this.recordStat(enemyTeamID, randomEnemyPick, "fga", 1)

                            this.recordStat(teamId, randomPlayerPick + 1, "fgp", 1);
                            this.recordStat(teamId, randomPlayerPick + 1, "tp", 25)

                            //ACS
                            this.recordStat(teamId, randomPlayerPick, "tp", 30)

                            creditsData[teamId][randomPlayerPick] += 200;

                            if(Math.random() > 0.5) {
                                plantedSpike = true;
                            }
                        } else {
                            this.recordStat(enemyTeamID, randomEnemyPick, "fg", 1);
                            deadPlayers[teamId].push(randomPlayerPick);
                            this.recordStat(teamId, randomPlayerPick, "fga", 1)

                            this.recordStat(enemyTeamID, randomEnemyPick, "tp", 90)

                            creditsData[enemyTeamID][randomEnemyPick] += 200;

                            if(Math.random() > 0.5) {
                                this.recordStat(enemyTeamID, randomEnemyPick + 1, "fgp", 1);
                                this.recordStat(enemyTeamID, randomEnemyPick + 1, "tp", 25)
                            }

                            if((Math.random() > 0.5) && (plantedSpike)) {
                                plantedSpike = false;
                                normalTimer = 175;
                            }
                        }
                    }
                } else {
                    if(deadPlayers[0].length >= 5 || deadPlayers[1].length >= 5) {
                        continue;
                    } else {
                        i--;
                    }

                    randomPlayerPick = Math.floor(Math.random() * 5)
                    randomEnemyPick = Math.floor(Math.random() * 5);
                }
                
                currentPlayer = { 
                    player: this.teams[teamId].player[randomPlayerPick],
                    agent: this.playerAgentPicks[teamId][randomPlayerPick]
                };

                enemyPlayer = {
                    player: this.teams[enemyTeamID].player[randomEnemyPick],
                    agent: this.playerAgentPicks[enemyTeamID][randomEnemyPick]
                }

                if(plantedSpike) {
                    spikeTimer += 15;
                }

                normalTimer += 15
            }

            if(roundCounter == 12) {
                this.simRound(roundCounter, enemyTeamID, creditsData)
            } else {
                this.simRound(roundCounter, teamId, creditsData)
            }

        } else {
            return;
        }
    }

    /**
     * Simulates in game weapon buys.
     *
     *
     *
     * @memberOf core.gameSim
     * @return {Array.<Object>}
     */
    GameSim.prototype.manageBuys = function(creditsData) {
        //Going through each then each player on a team and making a buy based on how much credit is available for [j] player
        for(let i = 0; i < 2; i++) {
            let average = 0;
            let roundType = "buy"

            for(let k = 0; k < creditsData[i].length; k++) {
                if(creditsData[i][k] < 0) {
                    creditsData[i][k] = 0;
                } else if(creditsData[i][k] > 9000) {
                    creditsData[i][k] = 9000
                }

                average += creditsData[i][k]
            }

            average = average/creditsData[i].length;

            if(average === 800) {
                roundType = "pistol"
            } else if(average < 3900) {
                roundType = "save"
            } else {
                roundType = "buy"
            }

            for(let j = 0; j < 5; j++) {
                let currentPlayer = { 
                    player: this.teams[i].player[j],
                    agent: this.playerAgentPicks[i][j]
                };

                let weaponsBuy;

                if(roundType === "pistol") {
                    if(currentPlayer.agent.role == "Duelist") {
                        //Replace this in the future for a more realistic buy
                        let choicePistols = ["Sheriff", "Ghost", "Shorty"];
                        let choice = Math.floor(Math.random() * 2);

                        weaponsBuy = {
                            "class": "sidearms",
                            "weapon": choicePistols[choice]
                        }

                    } else if(currentPlayer.agent.role == "Initiator" || currentPlayer.agent.role == "Smokes") {
                        let choicePistols = ["Sheriff", "Ghost", "Classic", "Frenzy"];
                        let choice = Math.floor(Math.random() * 4);

                        weaponsBuy = {
                            "class": "sidearms",
                            "weapon": choicePistols[choice]
                        }
                    } else {
                        let choicePistols = ["Sheriff", "Ghost", "Classic", "Frenzy", "Shorty"];
                        let choice = Math.floor(Math.random() * 5);

                        weaponsBuy = {
                            "class": "sidearms",
                            "weapon": choicePistols[choice]
                        }
                    }

                } else if(roundType === "buy") {
                    //Check if player can afford the gun
                    weaponsBuy = {
                        "class": "Rifles",
                        "weapon": currentPlayer.player.mainGun
                    }

                    //Add operator and odin logic here

                    let count = 0;
                    while(creditsData[i][j] < weaponsData[weaponsBuy.class][weaponsBuy.weapon].cost) {
                        //Check what weapon player can buy
                        let allWeapons = weapons.allWeapons.toReversed();

                        weaponsBuy = {
                            "class": weapons.getClass(allWeapons[count]),
                            "weapon": allWeapons[count]
                        }

                        count++;
                    }
                } else {
                    let count = 0;

                    weaponsBuy = {
                        "class": "sidearms",
                        "weapon": "Classic"
                    }

                    while((creditsData[i][j]/2) < weaponsData[weaponsBuy.class][weaponsBuy.weapon].cost) {
                        //Check what weapon player can buy

                        let allWeapons = weapons.allWeapons.toReversed();


                        weaponsBuy = {
                            "class": weapons.getClass(allWeapons[count]),
                            "weapon": allWeapons[count]
                        }


                        count++;
                    }
                }

                this.currentWeapon[i][j] = weaponsData[weaponsBuy.class][weaponsBuy.weapon];
                creditsData[i][j] -= weaponsData[weaponsBuy.class][weaponsBuy.weapon].cost;
            }
        }
    }

    //Picking with picking Agents for Players based on their role or random
	GameSim.prototype.agentPicks = function() {
		let agents = structuredClone(this.teams[0].player[0].champRel);
		//Used for checking if an Agent has already been selected on a team
		let usedAgents = [[],[]]


        //Agent pick. Hopefully in the Future implement Meta picks
		for(let i = 0; i < this.teams.length; i++) {
			let shuffledPlayerId = _.shuffle(Array.from(Array(5).keys()))
			
			for(let j = 0; j < 5; j++) {
				this.teams[i].player[shuffledPlayerId[j]].champions.length = 22;
				let playerAgentData = Array.from(this.teams[i].player[shuffledPlayerId[j]].champions)

				let filteredByBestAgents = playerAgentData.sort(function(a,b) {
					if(a.draftValue > b.draftValue) {
						return -1;
					} else if(a.draftValue < b.draftValue) {
						return 1;
					} else {
						return -1;
					}
				})

				if(Math.random() > 0.3) {
					let picked = false;
					let o = 0;

					while(!picked) {
						let pick = filteredByBestAgents[o].name;

						let agentData = agents.find(function(el) {
							if(el.name == pick) {
								return true;
							} else {
								return false;
							}
						})
						
						if(!usedAgents[i].includes(agentData.hid)) {
							picked = true;

							usedAgents[i].push(agentData.hid);
							this.playerAgentPicks[i][shuffledPlayerId[j]] = agentData;
							this.teams[i].player[shuffledPlayerId[j]].champUsed = pick;

                            this.recordStat(i, shuffledPlayerId[j], "champPicked", pick)
						}

						o++;
					}
				} else {
					let randomPick = Math.floor(Math.random() * playerAgentData.length);

					let picked = false;

					while(!picked) {
						let pick = filteredByBestAgents[randomPick].name;

						let agentData = agents.find(function(el) {
							if(el.name == pick) {
								return true;
							} else {
								return false;
							}
						})

						
						if(!usedAgents[i].includes(agentData.hid) && agentData.role == this.teams[i].player[shuffledPlayerId[j]].pos) {
							picked = true;

							usedAgents[i].push(agentData.hid);
							this.playerAgentPicks[i][shuffledPlayerId[j]] = agentData;
							this.teams[i].player[shuffledPlayerId[j]].champUsed = pick;
                            this.recordStat(i, shuffledPlayerId[j], "champPicked", pick)
						}

						randomPick = Math.floor(Math.random() * playerAgentData.length);
					}
				}
			}
		}
	}

    /**
     * Increments a stat (s) for a player (p) on a team (t) by amount (default is 1).
     *
     * @memberOf core.gameSim
     * @param {number} t Team (0 or 1, this.or or this.d).
     * @param {number} p Integer index of this.team[t].player for the player of interest.
     * @param {string} s Key for the property of this.team[t].player[p].stat to increment.
     * @param {number} amt Amount to increment (default is 1).
     */
    GameSim.prototype.recordStat = function (t, p, s, amt) {
        amt = amt !== undefined ? amt : 1;


        if (s !== "gs" && s !== "courtTime" && s !== "benchTime" && s !== "energy") {
            this.teams[t].stat[s] += amt;
            // Record quarter-by-quarter scoring too
            if (s === "pts") {
                this.teams[t].stat.ptsQtrs[this.teams[t].stat.ptsQtrs.length - 1] += amt;
            } else if  (s == "champPicked") {
				this.teams[t].player[p].stat[s] = amt;
			} else {
				this.teams[t].player[p].stat[s] += amt;				
			}
			
            if (this.playByPlay !== undefined) {
                this.playByPlay.push({
                    type: "stat",
                    qtr: this.teams[t].stat.ptsQtrs.length - 1,
                    t: t,
                    p: p,
                    s: s,
                    amt: amt
                });
            }
        }		
    };

    GameSim.prototype.recordPlay = function (type, t, names) {
        var i, sec, text, texts,namesUsed;

        if (this.playByPlay !== undefined) {
            if (type === "injury") {
                texts = ["{0} was injured!"];
            } else if (type === "ban") {
                texts = ["banned {0}"];							
            } else if (type === "champion") {
                texts = ["{0} picked {1}"];							
            } else if (type === "kill") {
                texts = ["{0} killed {1}"];				
            } else if (type === "assist1") {
                texts = ["{0} killed {1} with {2}"];				
            } else if (type === "assist2") {
                texts = ["{0} killed {1} with {2} and {3}"];				
            } else if (type === "assist3") {
                texts = ["{0} killed {1} with {2}, {3}, and {4}"];				
            } else if (type === "assist4") {
                texts = ["{0} killed {1} with {2}, {3}, {4}, and {5}"];				
            } else if (type === "nexus") {
                texts = ["{0} destroyed the Nexus"];							
            } else if (type === "towerOutBot") {
                texts = ["{0} destroyed the Bottom Lane Outer Tower"];
            } else if (type === "towerOutTop") {
                texts = ["{0} destroyed the Top Lane Outer Tower"];
            } else if (type === "towerOutMid") {
                texts = ["{0} destroyed the Middle Lane Outer Tower"];
            } else if (type === "dragon") {
                texts = ["{0} killed the Dragon"];
            } else if (type === "baron") {
                texts = ["{0} killed the Baron"];
            } else if (type === "towerInrBot") {
                texts = ["{0} destroyed the Bottom Lane Inner Tower"];
            } else if (type === "towerInrTop") {
                texts = ["{0} destroyed the Top Lane Inner Tower"];
            } else if (type === "towerInrMid") {
                texts = ["{0} destroyed the Middle Lane Inner Tower"];
            } else if (type === "towerInhBot") {
                texts = ["{0} destroyed the Bottom Lane Inhibitor Tower"];
            } else if (type === "towerInhTop") {
                texts = ["{0} destroyed the Top Lane Inhibitor Tower"];
            } else if (type === "towerInhMid") {
                texts = ["{0} destroyed the Middle Lane Inhibitor Tower"];
            } else if (type === "inhibBot") {
                texts = ["{0} destroyed the Bottom Lane Inhibitor"];
            } else if (type === "inhibTop") {
                texts = ["{0} destroyed the Top Lane Inhibitor"];
            } else if (type === "inhibMid") {
                texts = ["{0} destroyed the Middle Lane Inhibitor"];								
            } else if (type === "towerNexTop") {
                texts = ["{0} destroyed the Top Nexus Tower"];
            } else if (type === "towerNexBot") {
                texts = ["{0} destroyed the Bottom Nexus Tower"];
            } else if (type === "stl") {
                texts = ["{0} stole the ball from {1}"];
            } else if (type === "fgAtRim") {
                texts = ["{0} made a dunk/layup"];
            } else if (type === "fgAtRimAndOne") {
                texts = ["{0} made a dunk/layup and got fouled!"];
            } else if (type === "fgLowPost") {
                texts = ["{0} made a low post shot"];
            } else if (type === "fgLowPostAndOne") {
                texts = ["{0} made a low post shot and got fouled!"];
            } else if (type === "fgMidRange") {
                texts = ["{0} made a mid-range shot"];
            } else if (type === "fgMidRangeAndOne") {
                texts = ["{0} made a mid-range shot and got fouled!"];
            } else if (type === "tp") {
                texts = ["{0} made a three pointer shot"];
            } else if (type === "tpAndOne") {
                texts = ["{0} made a three pointer and got fouled!"];
            } else if (type === "blkAtRim") {
                texts = ["{0} blocked {1}'s dunk/layup"];
            } else if (type === "blkLowPost") {
                texts = ["{0} blocked {1}'s low post shot"];
            } else if (type === "blkMidRange") {
                texts = ["{0} blocked {1}'s mid-range shot"];
            } else if (type === "blkTp") {
                texts = ["{0} blocked {1}'s three pointer"];
            } else if (type === "missAtRim") {
                texts = ["{0} missed a dunk/layup"];
            } else if (type === "missLowPost") {
                texts = ["{0} missed a low post shot"];
            } else if (type === "missMidRange") {
                texts = ["{0} missed a mid-range shot"];
            } else if (type === "missTp") {
                texts = ["{0} missed a three pointer"];
            } else if (type === "orb") {
                texts = ["{0} grabbed the offensive rebound"];
            } else if (type === "drb") {
                texts = ["{0} grabbed the defensive rebound"];
            } else if (type === "ast") {
                texts = ["(assist: {0})"];
            } else if (type === "quarter") {
                texts = ["<b>Start of " + helpers.ordinal(this.team[0].stat.ptsQtrs.length) + " quarter</b>"];
            } else if (type === "overtime") {
                texts = ["<b>Start of " + helpers.ordinal(this.team[0].stat.ptsQtrs.length - 4) + " overtime period</b>"];
            } else if (type === "ft") {
                texts = ["{0} made a free throw"];
            } else if (type === "missFt") {
                texts = ["{0} missed a free throw"];
            } else if (type === "pf") {
                texts = ["Foul on {0}"];
            } else if (type === "foulOut") {
                texts = ["{0} fouled out"];
            } else if (type === "sub") {
                texts = ["Substitution: {0} for {1}"];
            } else if (type === "time") {
                texts = ["time"];
            }

            if (texts) {
                //text = random.choice(texts);
                text = texts[0];
                if (names && (this.t >  0) && (type != "kill") && (type != "assist1") && (type != "assist2") && (type != "assist3") && (type != "assist4") ) {
				    if (names.length == 1) {
//                        text = text.replace("{" + i + "}", names[i]);
					   namesUsed = names[0];
					} else if (names.length == 2) {
					   namesUsed = names[0]+" and "+names[1];
					} else if (names.length == 2) {
					   namesUsed = names[0]+" and "+names[1];
					} else if (names.length == 3) {
					   namesUsed = names[0]+", "+names[1]+", and "+names[2];
					} else if (names.length == 4) {
					   namesUsed = names[0]+", "+names[1]+", "+names[2]+", and "+names[3];
					} else if (names.length == 5) {
					   namesUsed = names[0]+", "+names[1]+", "+names[2]+", "+names[3]+", and "+names[4];
					}
	                   text = text.replace("{0}", namesUsed);
					
                   /* for (i = 0; i < names.length; i++) {
                        text = text.replace("{" + i + "}", names[i]);
                    }*/
                } else if (names) {
                    for (i = 0; i < names.length; i++) {
                        text = text.replace("{" + i + "}", names[i]);
                    }
				}
				

                if (type === "ast") {
                    // Find most recent made shot, count assist for it
                    for (i = this.playByPlay.length - 1; i >= 0; i--) {
                        if (this.playByPlay[i].type === "text") {
                            this.playByPlay[i].text += " " + text;
                            break;
                        }
                    }
                } else {
                    sec = Math.floor(this.t % 1 * 60);
                    if (sec < 10) {
                        sec = "0" + sec;
                    }
                    this.playByPlay.push({
                        type: "text",
                        text: text,
                        t: t,
                        time: Math.floor(this.t) + ":" + sec
                    });
                }
            } else {
                throw new Error("No text for " + type);
            }
        }
    };

    /**
     * Convert energy into fatigue, which can be multiplied by a rating to get a fatigue-adjusted value.
     *
     * @memberOf core.gameSim
     * @param {number} energy A player's energy level, from 0 to 1 (0 = lots of energy, 1 = none).
     * @return {number} Fatigue, from 0 to 1 (0 = lots of fatigue, 1 = none).
     */
    GameSim.prototype.fatigue = function (energy) {
        energy += 0.05;
        if (energy > 1) {
            energy = 1;
        }

        return energy;
    };

    return {
        GameSim: GameSim
    };
});