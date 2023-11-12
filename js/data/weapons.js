
/**
 * @name data.weapons
 * @namespace All weapons in valorant
 */
define(["lib/underscore"], function() {
    "use strict";

    var weapons = {
        "sidearms": {
            "Classic": {
                name: "Classic",
                cost: 0,
                value: 10
            },
            "Shorty": {
                name: "Shorty",
                cost: 200,
                value: 20
            },
            "Frenzy": {
                name: "Frenzy",
                cost: 400,
                value: 25
            },
            "Ghost": {
                name: "Ghost",
                cost: 500,
                value: 50
            },
            "Sheriff": {
                name: "Sheriff",
                cost: 800,
                value: 55
            }
        },
        "SMGS": {
            "Stinger": {
                name: "Stinger",
                cost: 1000,
                value: 56
            },
            "Spectre": {
                name: "Spectre",
                cost: 1600,
                value: 65
            }
        },
        "Shotguns": {
            "Bucky": {
                name: "Bucky",
                cost: 800,
                value: 55
            },
            "Judge": {
                name: "Judge",
                cost: 1500,
                value: 70
            }
        },
        "Rifles": {
            "Bulldog": {
                name: "Bulldog",
                cost: 2100,
                value: 80
            },
            "Guardian": {
                name: "Guardian",
                cost: 2500,
                value: 85
            },
            "Phantom": {
                name: "Phantom",
                cost: 2900,
                value: 90
            },
            "Vandal": {
                name: "Vandal",
                cost: 2900,
                value: 90
            }
        },
        "Sniper Rifles": {
            "Marshall": {
                name: "Marshall",
                cost: 950,
                value: 60
            },
            "Operator": {
                name: "Operator",
                cost: 4500,
                value: 95
            }
        },
        "Machine Guns": {
            "Ares": {
                name: "Ares",
                cost: 1600,
                value: 50
            },
            "Odin": {
                name: "Odin",
                cost: 3200,
                value: 92,
            }
        }
    }


    var allWeapons = ["Classic", "Shorty", "Frenzy", "Ghost", "Sheriff", "Stinger", "Spectre", "Bucky", "Judge", "Bulldog", "Guardian", "Phantom", "Vandal", "Marshall", "Operator", "Ares", "Odin"];


    function getClass(weaponName) {
        let keys = _.keys(weapons);

        for(let i = 0; i < keys.length; i++) {
            if((weapons[keys[i]][weaponName]) && (weaponName === weapons[keys[i]][weaponName].name)) {
                return keys[i];
            }
        }
    }

    return {
        weapons: weapons,
        getClass: getClass,
        allWeapons: allWeapons
    };
})