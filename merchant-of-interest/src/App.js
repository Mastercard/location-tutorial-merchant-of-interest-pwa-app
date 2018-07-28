import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Map from './Map';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Merchant of Interest</h1>
        </header>
        <p className="App-intro">
          Browse merchants of interest globally
        </p>
        <div className="Map-container">
          <Map />
        </div>
      </div>
      
    );
  }
}

export default App;
