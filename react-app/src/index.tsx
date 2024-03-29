import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom'
// import { createBrowserHistory } from 'history'
import App from './App';
// import reportWebVitals from './reportWebVitals';

// https://stackoverflow.com/questions/69948150/property-history-does-not-exist-on-type-intrinsicattributes
// const history = createBrowserHistory()

// {/* <Router history={history}> */}
//   {/* <Router> */}
//   <App />,
//   {/* </Router>, */}
ReactDOM.render(
  <App />,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()
