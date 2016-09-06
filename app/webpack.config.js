
var path = require('path');


var sourceDir = path.resolve(__dirname),
    destDir = path.resolve(__dirname +'/dist');

function source (p) {
    return path.join(sourceDir, p);
}

function dest (p) {
    return path.join(destDir, p);
}

var loaders = [],
    plugins =[];

var webpackOptions = {
    context: source('/src'),
    entry: './wmap',
    output: {
        path: destDir,
        publicPath: '/static/',
        filename: 'wmap.js'
    },
    module: {
        loaders: loaders
    },
    plugins: plugins,
    resolve: {
    // you can now require('file') instead of require('file.coffee')
        extensions: ['', '.js', '.json']
    },
};

// devtool: '#eval-source-map',
webpackOptions.devtool = 'source-map';

// babel
loaders.push({
    test: /\.js$/,
    exclude: /(node_modules|vendors)/,
    loader: 'babel-loader',
    query: {
        presets: ['es2015']
    }
});

if ('production' === process.env.NODE_ENV) {
    var ClosureCompilerPlugin = require('webpack-closure-compiler');
    plugins.push(new ClosureCompilerPlugin({
        compiler: {
            language_in: 'ECMASCRIPT6',
            language_out: 'ECMASCRIPT5_STRICT',
            compilation_level: 'ADVANCED',
            assume_function_wrapper: true,
            output_wrapper: '(function(){\n%output%\n}).call(this)\n'
        },
        concurrency: 3,
    }));
}

module.exports = webpackOptions;

// const ClosureCompiler = require('google-closure-compiler-js').webpack;
// const path = require('path');
//
// module.exports = {
//     entry: [
//         path.join(__dirname, 'src/wmap.js')
//     ],
//     output: {
//         path: path.join(__dirname, 'dist'),
//         filename: 'wmap.min.js'
//     },
//     plugins: [
//         new ClosureCompiler({
//             options: {
//                 languageIn: 'ECMASCRIPT6',
//                 languageOut: 'ECMASCRIPT5',
//                 compilationLevel: 'ADVANCED',
//                 warningLevel: 'VERBOSE',
//                 processCommonJsModules: true,
//                 externs: 'node'
//             },
//         })
//     ]
// };
