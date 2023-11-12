# target: all - Default target. Minify JavaScript and CSS.
all: clean build-js build-css

# target: cordova - Minify JavaScript and CSS, and put files ready for Cordova distribution in the cordova folder.
cordova: clean build-js build-css cp-cordova

# target: check - Run tests.
check:
	@echo "Tests can only be run from the browser because there is no IndexedDB support elsewhere. To run tests, go to http://BASKETBALL-GM-URL/test in your web browser."

# target: docs - Regenerate documentation from source code using jsdoc-toolkit.
docs:
	rm -rf docs
	jsdoc -d=docs -s js js/core js/util js/views

# target: lint - Run ESLint on all source files except third-party libraries.
lint:
	node node_modules/eslint/bin/eslint.js js


### Targets below here are generally just called from the targets above.

# target: build-css - Concatenate main CSS files and run YUI compressor. ORIGINAL: type css/bootstrap.css css/bbgm.css css/bbgm-notifications.css css/DT_bootstrap.css | 

# [VAL NOTES]: Changed YUI with crass since node-minify cli does not accept type for cli options
build-css: 
	type css\bootstrap.css css\bbgm.css css\bbgm-notifications.css css\DT_bootstrap.css > genoutput.css
	node-minify --compressor crass --input ./genoutput.css --output gen/bbgm.css
	del ".\genoutput.css"

# target: build-js - Run the RequireJS optimizer to concatenate and minify all JavaScript files.
build-js: 
	node r.js -o baseUrl=js paths.requireLib=lib/require optimize=uglify2 preserveLicenseComments=false generateSourceMaps=true name=app include=requireLib mainConfigFile=js/app.js out=gen/app.js

# target: appcache-timestamp - Update the timestamp in bbgm.appcache so that browsers will look for changed files
appcache-timestamp:
	sed -i "s/LAST UPDATED:.*/LAST UPDATED: `date`/" bbgm.appcache

# target: rev-timestamp - Update the timestamp in index.html (year.month.date.minutes)
mins = $$((`date +"%_M"` + 60 * `date +"%_H"`))
rev-timestamp:
	sed -i "s/<!--rev-->.*<\/p>/<!--rev-->`date +"%Y.%m.%d"`.$(mins)<\/p>/" index.html
	sed -i "s/Bugsnag\.appVersion = \".*\"/Bugsnag.appVersion = \"`date +"%Y.%m.%d"`.$(mins)\"/" index.html

# target: clean - Delete files generated by `make all`.
clean:
	del ".\gen\app.js"
	del ".\gen\bbgm.css"

# target: cp-cordova - Move files needed for Cordova to the cordova folder, removing source maps.
cp-cordova:
	cp index.html cordova/index.html
	cp fonts/* cordova/fonts
	head -n -1 gen/app.js > cordova/gen/app.js # Copy while removing source maps comment
	cp gen/bbgm.css cordova/gen/bbgm.css



###

.PHONY: all check docs lint build-css build-js clean