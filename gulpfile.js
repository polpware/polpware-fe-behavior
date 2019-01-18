const { src, dest, parallel } = require('gulp');
const typedoc = require("gulp-typedoc");

function doc() {
    return src(["src/**/*.ts"])
        .pipe(typedoc({
            name: "Polpware typescript behavior (3.0.0)",            
            out: "docs/",            
            
            module: "commonjs",
            target: "es5",

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

exports.doc = doc;
exports.default = doc;
