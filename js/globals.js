/**
 * @name globals
 * @namespace Defines the constant portions of g.
 */
define(["lib/knockout", "util/random"], function (ko,random) {
    "use strict";

    // The way this works is... any "global" variables that need to be widely available are stored in g. Some of these are constants, like the ones defined below. Some others are dynamic, like the year of the current season, and are stored in the gameAttributes object store. The dynamic components of g are retrieved/updated/synced elsewhere. Yes, it's kind of confusing and arbitrary.

    var g, splitUrl;

    g = {};

    // If any of these things are supposed to change at any point, they should be stored in gameAttributes rather than here.
//    g.confs = [{cid: 0, name: "League Championship Series"}, {cid: 1, name: "Challenger Series"}, {cid: 2, name: "Ladder"}];
//    g.divs = [{did: 0, cid: 0, name: "LCS"}, {did: 1, cid: 1, name: "CS"}, {did: 2, cid: 2, name: "L"}];
//    g.confs = [{cid: 0, name: "Eastern Conference"}, {cid: 1, name: "Western Conference"}];
//    g.divs = [{did: 0, cid: 0, name: "Atlantic"}, {did: 1, cid: 0, name: "Central"}, {did: 2, cid: 0, name: "Southeast"}, {did: 3, cid: 1, name: "Southwest"}, {did: 4, cid: 1, name: "Northwest"}, {did: 5, cid: 1, name: "Pacific"}];
    g.salaryCap = 100000000;  // [thousands of dollars]
    g.minPayroll = 0;  // [thousands of dollars]
    g.luxuryPayroll = 100000000;  // [thousands of dollars]
    g.luxuryTax = 0;
    g.minContract = 15;  // [thousands of dollars]
    g.maxContract = 999;  // [thousands of dollars]
    g.minRosterSize = 6;

    // Constants in all caps
    g.PHASE = {
        FANTASY_DRAFT: -1,
        PRESEASON: 0,
        REGULAR_SEASON: 1,
        AFTER_TRADE_DEADLINE: 2,
        PLAYOFFS: 3,
        BEFORE_DRAFT: 4,
        RESIGN_PLAYERS: 5,
        FREE_AGENCY: 6
     /*   DRAFT: 5,
        AFTER_DRAFT: 6,
        RESIGN_PLAYERS: 7,
        FREE_AGENCY: 8*/
    };
    g.PLAYER = {
        FREE_AGENT: -1,
        UNDRAFTED: -2,
        RETIRED: -3,
        UNDRAFTED_2: -4, // Next year's draft class
        UNDRAFTED_3: -5, // Next next year's draft class
        UNDRAFTED_FANTASY_TEMP: -6 // Store current draft class here during fantasy draft
    };

    g.PHASE_TEXT = {
        "-1": "fantasy draft",
        "0": "preseason",
        "1": "regular season",
        "2": "regular season",
        "3": "playoffs",
        "4": "before re-signing",		
        "5": "re-sign players",
        "6": "free agency"
    };

    g.vm = {
        topMenu: {
            lid: ko.observable(),
            godMode: ko.observable(),
            options: ko.observable([]),
            phaseText: ko.observable(),
            statusText: ko.observable(),
            template: ko.observable(), // Used for left menu on large screens for highlighting active page, so g.vm.topMenu should really be g.vm.menu, since it's used by both
            username: ko.observable(null)
        },
        multiTeam: {
            userTid: ko.observable(null),
            userTids: ko.observable([])
        }		
    };

    g.enableLogging = window.enableLogging;

    // .com or .dev TLD
    if (!window.inCordova) {
        splitUrl = window.location.hostname.split(".");
        g.tld = splitUrl[splitUrl.length - 1];
    } else {
        // From within Cordova, window.location.hostname is not set, so always use .com
        g.tld = "com";
    }

    g.sport = "valorant"; // For account ajax stuff


    //Val GM stuff
    g.leaderboardData = {
        players: [""],
        season: "",
        page: {},
        navigate: true,
    }
	
    // THIS MUST BE ACCURATE OR BAD STUFF WILL HAPPEN
//    g.notInDb = ["dbm", "dbl", "lid", "confs", "divs", "salaryCap", "minPayroll", "luxuryPayroll", "luxuryTax", "minContract", "maxContract", "minRosterSize", "PHASE", "PLAYER","PHASE_TEXT", "gameSimWorkers","vm", "enableLogging", "tld", "sport", "compositeWeights", "notInDb"];
    g.notInDb = ["dbm", "dbl", "lid", "confs", "divs", "salaryCap", "minPayroll", "luxuryPayroll", "luxuryTax", "minContract", "maxContract", "minRosterSize", "PHASE", "PLAYER","PHASE_TEXT", "gameSimWorkers","vm", "enableLogging", "tld", "sport",  "notInDb", "leaderboardData"];

    return g;
});