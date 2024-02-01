/**
 * @name data.changes
 * @namespace Changes in gameplay to show the user.
 */
define(["lib/jquery", "util/eventLog"], function ($, eventLog) {
    "use strict";

    var all;

    all = [{
        date: "2024-02-01",
        msg: 'Initial Public Offering 🙂'
    }];

    function check() {
        var i, linked, text, unread;

        // Don't show anything on first visit
        if (localStorage.changesRead === undefined) {
            localStorage.changesRead = all.length;
        }

        if (localStorage.changesRead < all.length) {
            unread = all.slice(localStorage.changesRead);

            text = "";
            linked = false;

            for (i = 0; i < unread.length; i++) {
                if (i > 0) {
                    text += "<br>";
                }
                text += "<strong>" + unread[i].date + "</strong>: " + unread[i].msg;
                if (i >= 2 && (unread.length - i - 1) > 0) {
                    linked = true;
                    text += '<br><a href="/changes">...and ' + (unread.length - i - 1) + ' more changes.</a>';
                    break;
                }
            }

            if (!linked) {
                text += '<br><a href="/changes">View All Changes</a>';
            }

            eventLog.add(null, {
                type: "changes",
                text: text,
                saveToDb: false
            });

            localStorage.changesRead = all.length;
        }
    }

    return {
        all: all,
        check: check
    };
});