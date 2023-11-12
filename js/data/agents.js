/**
 * @name data.names
 * @namespace First names and last names.
 */
define([], function () {
    "use strict";

    var agents;

    // http://www.census.gov/genealogy/www/data/1990surnames/names_files.html
    // Name, Role, Attack(out of 10), Defense(out of 10),Utility, Ultimate, Difficulty, Tracking ID, Secondary Role
    agents = [
		//Duelists
		["Jett","Duelist",10,3,5,10,5,1, "Opper"],
		["Reyna","Duelist",5,2,7,8,2,2, "Flash"],
		["Pheonix","Duelist",7,4,5,7,7,3, "Flash"],
		["Raze","Duelist",10,4,8,6,8,4, "Movement"],
		["Neon","Duelist",6,2,5,8,7,5, "Movement"],
		["Yoru","Duelist",5,3,7,5,8,6, "Flash"],

		//Sentinals
		["Chamber", "Sentinal",5,7,6,10,8,7, "Opper"],
		["Killjoy", "Sentinal",3,10,8,10,5,8, "Stationary"],
		["Sage", "Sentinal",5,7,7,10,2,9, "Heal"],
		["Cypher", "Sentinal",2,10,8,6,3,10, "Stationary"],
		["Deadlock", "Sentinal",4,8,7,6,6,11, "Stationary"],

		//Initiators
		["Skye","Initiator",6,8,10,10,5,12, "Heal"],
		["Sova","Initiator",5,7,8,6,8,13, "Info"],
		["Kayo","Initiator",5,5,10,10,3,14, "Info"],
		["Breach","Initiator",6,7,7,9,8,15, "Flash"],
		["Fade","Initiator",6,6,7,8,1,16, "Info"],
		["Gekko","Initiator",7,5,8,8,6,17, "Flash"],

		//Smokes
		["Brimstone","Smokes",6,8,7,7,2,18, "Ball"],
		["Viper","Smokes",4,8,8,8,6,19, "Wall"],
		["Astra","Smokes",7,7,8,5,8,20, "Ball"],
		["Omen","Smokes",8,5,9,6,5,21, "Ball"],
		["Harbor","Smokes",7,4,5,9,5,22, "Wall"],
	];


    return {
        agents: agents
    };
});