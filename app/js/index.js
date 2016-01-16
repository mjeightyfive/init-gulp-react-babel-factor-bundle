import React from 'react';
import ReactDom from 'react-dom';
import HelloWorld from './hello-world';

ReactDom.render(
    <HelloWorld phrase="React + ES6"/>,
    document.getElementById('main')
);

console.log('index.js');
