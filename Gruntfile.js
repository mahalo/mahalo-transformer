const fs = require('fs');
const ts = require('typescript');

module.exports = function(grunt) {
    grunt.registerTask('default', function() {
        var options = {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES5
                }
            };
        
        fs.writeFileSync('index.js', ts.transpileModule(fs.readFileSync('index.ts').toString(), options).outputText);
        fs.writeFileSync('module-exists.js', ts.transpileModule(fs.readFileSync('module-exists.ts').toString(), options).outputText);
    });
};