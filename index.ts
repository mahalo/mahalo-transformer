import {existsSync, readFileSync, writeFileSync} from 'fs';
import {basename, dirname, join} from 'path';
import {SourceMapGenerator} from 'source-map';
import {minify} from 'html-minifier';
import moduleExists from './module-exists';

export default function mahaloTransformer(fileName: string, extension?: string, minimize = true) {
    let text = readFileSync(fileName).toString();
    let map = fileName + '.ts';
    let context = dirname(fileName);
    let components = [];
    let behaviors = [];
    let styles = [];
    let images = [];
    let mapGenerator = new SourceMapGenerator();

    mapGenerator.addMapping({
        generated: {line: 1, column: 0},
        original: {line: 1, column: 0},
        source: basename(fileName)
    });

    extension = '.' + (extension || 'mhml');

    // Add dummy file for nice IDE inegration
    existsSync(map) || writeFileSync(map, 'var Template: ITemplate;\n\nexport default Template;');
    
    minimize && (text = minify(text, {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        removeScriptTypeAttributes: true,
        removeRedundantAttributes: true
    }));

    // Find use tags and handle them
    text = text.replace(USE_TAG, (m, kind, path, _, selector) => {
        resolveModule(kind, path, selector, components, behaviors);
        
        return '';
    });
    
    // Find stylesheets and handle them
    text = text.replace(LINK_TAG, (m, _, path) => {
        styles.push("require('" + path + "')");
        
        return '';
    });
    
    // Find images and handle them (step 1)
    text = text.replace(IMG_TAG, (m, _, path, __) => {
        var i = images.length;

        path = /^\//.test(path) ? process.cwd().replace(/\\/g, '/') + path : path;

        images.push("\" + require('" + path + "') + \"");
        
        return '<img ' + _ + 'src="###require' + i + '"' + __ + '>';
    });

    // Make sure content is an exportable string
    text = JSON.stringify(text);

    // Find images and handle them (step 2)
    text = text.replace(/###require(\d+)/g, (m, i) => images[i]);

    return {
        fileName: fileName,
        text: compile(components, behaviors, styles, text),
        map: JSON.parse(mapGenerator.toString())
    };


    //////////

    
    function resolveModule(kind, path, selector, components, behaviors) {
        var desc = {
                selector: getSelector(selector, path, kind),
                path: path,
                files: []
            };
        
        if (kind === 'component') {
            components.push(desc);		
            
            moduleExists(context, path, '.ts') && addComponent(desc);
            moduleExists(context, path, extension) && addTemplate(desc, extension);
        } else {
            behaviors.push(desc);
            
            moduleExists(context, path, '.ts') && addBehavior(desc);
        }
    }
}


//////////


var USE_TAG = /<use\s*(component|behavior)="(~?[\w\/.-]+)"(\s*select="([^"]+)")?\s*\/>\s*/ig,
    LINK_TAG = /<link\s(.*?)href="(~?[\w\/.-]*)"[^>]*>\s*/ig,
    IMG_TAG = /<img\s(.*?)src="(~?[\w\/.-]*)"([^>]*)>/ig,
    VALID_SELECTOR = /^((\.-?)?[\w][\w-]*|\[[^\s"'>\/=]+([*^]?=(["'])[^\4]*\4)?](?![\w]))+$/,
    VALID_ATTRIBUTE = /^[^\s"'>\/=]+$/;

function addComponent(desc) {
    desc.files.push(`Component: require('${desc.path}')['default']`);
}

function addTemplate(desc, extension) {
    desc.files.push(`template: require('${desc.path}${extension}')['default']`);
}

function addBehavior(desc) {
    desc.files.push(`'${desc.selector}': require('${desc.path}')['default']`);
}

function getSelector(selector: string, path: string, kind: string) {
    if (selector) {
        if (kind === 'component') {
            if (!VALID_SELECTOR.test(selector)) {
                throw Error('Invalid selector for component');
            }
        } else if (!VALID_ATTRIBUTE.test(selector)) {
            throw Error('Invalid attribute name for behavior.');
        }
    } else {
        selector = path.split('/').pop().replace(/[^\w]/g, '-').replace(/^-/, '');
    }

    return selector;
}

function compile(components, behaviors, styles, text) {
    var _components = [],
        _behaviors = [];
    
    components.forEach(component => {
        component.files.length && _components.push(`'${component.selector}': {\n\t\t\t${component.files.join(',\n\t\t\t')}\n\t\t}`);
    });
    
    behaviors.forEach(behavior => {
        behavior.files.length && _behaviors.push(behavior.files[0]);
    });
    
    return `"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
${styles.length ? '\n' + styles.join(';\n') + ';\n' : ''}
var Template = require('mahalo')['Template'],
    components = {\n\t\t${_components.join(',\n\t\t')}\n\t},
    behaviors = {\n\t\t${_behaviors.join(',\n\t\t')}\n\t};		

exports.default = new Template(${text}, components, behaviors);`;
}