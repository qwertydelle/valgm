/**
 * @name views.leaderboard
 * @namespace leaderboard.
 */
define(["dao", "ui", "util/bbgmView", "lib/knockout", "globals", "lib/bluebird", "core/player"], function (dao, ui, bbgmView, ko, g, Promise, player) {
    "use strict";

    function get(req) {
        return {
            num: req.params.num
        }
    }

    function uiFirst() {
        ui.title("Leaderboard")
    }

    function InitViewModel(inputs) {
        this.selectedRank = ko.observable()
        this.navigate = true;

        this.selectedRank.subscribe((newValue) => {
            console.log(this)
            if(newValue.startsWith("Immortal")) {
                $("#rankimage").attr("src", "/img/badges/immortal-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)
                let index;

                if(newValue === "Immortal 3") {
                    index = g.leaderboardData.players.findIndex(e => {
                        if(e.fuzzedMMR < 500) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                } else if(newValue === "Immortal 2") {
                    index = g.leaderboardData.players.findIndex(e => {
                        if(e.fuzzedMMR < 90) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                } else {
                    index = 9
                }


                if(Object.keys(g.leaderboardData.page) !== 0 && this.navigate) {
                    if(index == 9) {
                        g.leaderboardData.page.goToPage(1);
                    } else {
                        g.leaderboardData.page.goToPage(Math.trunc(index / 9) + 1);
                    };
                }

                sessionStorage.setItem("Leaderboard-select", newValue);
            } else {
                $("#rankimage").attr("src", "/img/badges/radiant-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)

                if(Object.keys(g.leaderboardData.page).length !== 0 && this.navigate) {
                    g.leaderboardData.page.goToPage(1);
                }

                sessionStorage.setItem("Leaderboard-select", newValue);
            }


            this.navigate = true;
        });
        

        console.log(this.selectedRank())



        if(this.selectedRank() && this.selectedRank().startsWith("Immortal")) {
            $("#rankimage").attr("src", "/img/badges/immortal-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)
        } else {
            $("#rankimage").attr("src", "/img/badges/radiant-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)
        }
        
        this.optionsRanks = ko.observableArray([
            "Radiant",
            "Immortal 3",
            "Immortal 2",
        ])

        this.lid = g.vm.topMenu.lid;
    }


    //Filters ranked players
    function getRankedPlayers(inputs, events, vm) {
        var min = 0;
        var max = 9;

        let filtered = ko.observableArray()

        return Promise.all([
            dao.players.getAll()
        ]).spread(function(p) {
            

            //Sort rank by greatest to least
            p = p.sort((a, b) => {
                if((a.fuzzedMMR > b.fuzzedMMR) || (a.fuzzedMMR == b.fuzzedMMR)) {         
                    return -1
                } else {
                    return 1
                }
            });


            //Give each player a ranknum based on their position
            let i = 0;
            p = p.map(e => {
                if(e.tid != -3) {
                    e.rankNum = ++i;
                }
                return e;
            });


            p = p.filter(p => p.tid != -3);


            //Merge content creators here

            g.leaderboardData.players = p;


            min = (inputs.num * max) - max;
            max = inputs.num * max;

            let portion = p.slice(min,max);

            if(portion.find(p => p.fuzzedMMR < 90)) {
                vm.navigate = false;
                
                if(vm.selectedRank() === "Immortal 2") {
                    vm.navigate = true;
                } else {
                    vm.selectedRank("Immortal 2");
                }
            } else if(portion.find(p => p.fuzzedMMR < 500)) {
                vm.navigate = false;
                
                if(vm.selectedRank() === "Immortal 3") {
                    vm.navigate = true;
                } else {
                    vm.selectedRank("Immortal 3");
                }
            } else {
                vm.navigate = false;

                if(vm.selectedRank() === "Radiant") {
                    vm.navigate = true;
                } else {
                    vm.selectedRank("Radiant");
                }
            }


            return {
                p: portion,
            }
        });
        
    }

    //Pagination
    function uiUpdate(inputs, events, vm) {
        var min = 0;
        var max = 9;

        var pagination = new pag({
            container: document.getElementById("pagination-1"),
            pageClickUrl: "/l/" + g.vm.topMenu.lid() + "/leaderboard/{{page}}",
            pageClickCallback: function (pageNumber) {
                let index = ((pageNumber * 9) - 9);
                let portion = g.leaderboardData.players.slice(index, index + 9);

                if(portion.find(p => p.fuzzedMMR < 90)) {
                    vm.navigate = false;

                    if(vm.selectedRank() === "Immortal 2") {
                        vm.navigate = true;
                    } else {
                        vm.selectedRank("Immortal 2");
                    }
                } else if(portion.find(p => p.fuzzedMMR < 500)) {
                    vm.navigate = false;
                    
                    if(vm.selectedRank() === "Immortal 3") {
                        vm.navigate = true;
                    } else {
                        vm.selectedRank("Immortal 3");
                    }
                } else {
                    vm.navigate = false;

                    if(vm.selectedRank() === "Radiant") {
                        vm.navigate = true;
                    } else {
                        vm.selectedRank("Radiant");
                    }
                }

                console.log(vm)
            }
        });

        min = (inputs.num * max) - max;
        max = inputs.num * max;


        pagination.make(g.leaderboardData.players.length, 9, inputs.num);

        g.leaderboardData.page = pagination;


        console.log(vm.selectedRank())
        
        if(vm.selectedRank() && vm.selectedRank().startsWith("Immortal")) {
            $("#rankimage").attr("src", "/img/badges/immortal-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)
        } else {
            $("#rankimage").attr("src", "/img/badges/radiant-badge.png").css("opacity", 0).animate({opacity: 1}, 1000)
        }
    }

    //Update the season
    function updateSeason() {
        let phasetext = g.vm.topMenu.phaseText();

        return {
            season: phasetext.split(" ")[0],
        }
    }
  

    return bbgmView.init({
        id: "leaderboard",
        get: get,
        InitViewModel: InitViewModel,
        runBefore: [updateSeason, getRankedPlayers],
        runAfter: [uiUpdate],
        uiFirst: uiFirst
    });
});