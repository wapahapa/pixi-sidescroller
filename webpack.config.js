const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginConfig = new HtmlWebpackPlugin({
    template: './client/index.html',
    filename: 'index.html',
    inject: 'body'
})

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ExtractTextPluginConfig = new ExtractTextPlugin('./client/styles/styles.css', {
    allChunks: true
})

module.exports = {
    entry: [
        './client/index.js'
    ],
    output: {
        path: path.resolve('dist'),
        filename: 'index_bundle.js'
    },
    module: {
        rules: [
            {test: /\.js$/, use:'babel-loader', exclude: /node_modules/},
            {test: /\.jsx$/, use:'babel-loader', exclude: /node_modules/},
            
            {test:/\.(png|jpg|jpeg|gif|svg)$/, use: 'url-loader'},

            {test: /\.css$/, use: ExtractTextPluginConfig.extract({fallback: 'style-loader', use: ['css-loader']})}
        ]

        
    },
    devServer: {
        contentBase: path.join(__dirname, "dist")
    },
    plugins: [
        HtmlWebpackPluginConfig,
        ExtractTextPluginConfig
    ]

}
