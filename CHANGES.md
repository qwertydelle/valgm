Don't read much into the release dates. Changes are pushed live as often as
possible, regardless of whether I make an official release with a new version
number or not.

# 3.5.0 (???)

## Techincal details

- Wrapped all IndexedDB calls in a Promises-based abstraction layer

# 3.4.0 (2014-12-05)

## Gameplay and UI

- "God Mode" including Create A Player, Edit Player, and Force Trade
- New trade AI, fixing a ton of loopholes
- Achievements
- Upcoming Free Agents page
- Export of entire league data
- Easy import of custom draft classes
- Whole league export
- More realistic player development algorithm

## Technical details

- Separated playerStats object store from players object store for performance

# 3.3.0 (2014-01-21)

## Gameplay and UI

- AppCache used to allow offline play
- Fantasy Draft feature
- Extended free agency phase
- Live play-by-play game simulation
- Removed roster size limit restriction on trades
- Centralized notification system and event log
- Smarter in-game coach: substitutions are based on performance, not just ratings
- GM firings happen after the playoffs, not before the regular season
- Finals MVP award
- Season totals, per 36 minutes stats, and career stats are viewable from the main player stats page
- Option to delete old game data to improve performance
- Future draft classes are visible up to 3 years in the future
- New default team regions and names
- Watch List where selected players can be tracked

## Technical details

- Refactored core.trade API

# 3.2.0 (2013-10-05)

## Gameplay and UI

- New mobile-friendly design
- Trading Block feature
- "What would make this deal work?" button can add assets from either team
- Removed the ability to "buy out" players to get rid of bad contracts
- AI teams will not trade away more than two draft picks in a single trade
- Fewer high-rated big men are generated
- Support for customized team names
- Support for player images in custom rosters
- After being fired, you can get hired by another team
- Quarter-by-quarter scoring in box scores

## Technical details

- Upgraded to Bootstrap 3
- Added ability to alert users to new features without relying on an IndexedDB upgrade

# 3.1.1 (2013-07-26)

## Technical details

- Just a bunch of minor bug fixes

# 3.1.0 (2013-07-17)

## Gameplay and UI

- Player contract demands are based on ratings and stats, not just ratings
- Future draft picks can be traded
- "What would make you agree to this deal?" button to get counter-offers in trade negotiations
- GMs of other teams pursue different strategies depending on if they are contending or rebuilding

## Technical details

- Internet Explorer 10 works much more smoothly now, although it's still not very well tested

# 3.0.0 (2013-06-23)

## Gameplay and UI

- Can export rosters from a league
- Ability to use a custom roster file rather than randomly-generated players in a new league
- Hall of Fame

# 3.0.0-beta.3 (2013-05-20)

## Gameplay and UI

- Draft lottery, based on NBA rules
- Made it harder to fleece the AI in trades
- Faster UI, particularly in the game log
- Team history viewable for any team, including a table of all players who played for that team
- Playing time can be controlled from the roster page

## Technical details

- Refactored views from a single giant file into multiple more managable files in the views folder
- Moved templates from Handlebars.js to Knockout
- Smarter realtime UI updates, so that database reads and DOM updates occur less frequently

# 3.0.0-beta.2 (2013-03-23)

## Gameplay and UI

- Injuries
- Home court advantage in game simulation
- More refined financial data, such as different classes of revenue and expenses
- Team finances view, which includes a lot of information that was not previously accessible
- "Hype" for a team governs things like attendance and revenue
- Different population sizes for different regions, which influences revenue and thus game difficulty
- Awards and salaries from previous seasons displayed in player view
- Many small bug fixes and UI improvements
- More sane and less adversarial contract negotiations, with more direct feedback about what the player is thinking
- Settings to control various budget items, such as ticket price, scouting budget, etc.
- "Fuzz" in displayed player ratings: the more spent on scouting, the more accurate the displayed ratings
- More historical information in player view: previous contracts and awards won
- Annual interactions with the owner: if you do poorly, you might get fired
- Free agents refuse to sign with your team if they don't like you

## Technical details

- Support for minification and compiling of templates/CSS/JavaScript, all easily controllable from the Makefile
- More unit tests (although many more are still needed)
- Moved all JavaScript out of templates

# 3.0.0-beta (2013-03-02)

- First release in a very long time, so basically everything changed