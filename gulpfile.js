const { src, dest, parallel } = require('gulp');
const typedoc = require("gulp-typedoc");
const bumpversion = require('gulp-bump');

// `fs` is used instead of require to prevent caching in watch (require caches)
const fs = require('fs');

function getVersion() {
    return fs.readFileSync('./VERSION', 'utf8', function(err, data) {
        return data;
    });
};

function doc() {
    const newVer = getVersion().trim();
    
    return src(["projects/polpware/fe-behavior/src/lib/**/*.ts"])
        .pipe(typedoc({
            name: "Polpware typescript behavior " + newVer,            
            out: "docs/",            
            
            module: "commonjs",
            target: "es5",

            exclude: "projects/polpware/fe-behavior/src/lib/**/*.spec.ts",                                    

            experimentalDecorators: true,
            excludePrivate: true,
            excludeExternals: true,

            "lib": [
                "lib.dom.d.ts",
                "lib.es2015.d.ts",                
                "lib.es2016.d.ts"
            ]
            
        }));
}

function bump() {

    const newVer = getVersion().trim();

// bump versions on package/bower/manifest
    return src(['./package.json', './projects/polpware/fe-behavior/package.json'])
        .pipe(bumpversion({
            version: newVer
        }))
        .pipe(dest(function(x) {
            return x.base;
        }));
}

exports.bump = bump;
exports.doc = doc;
exports.default = doc;
