import * as React from 'react';
import { useState, useEffect } from 'react';
import * as Papa from 'papaparse'
import ParentSize from '@visx/responsive/lib/components/ParentSize';

import Model from './Model';
import './App.scss';


function App() {
  // const rawData : string = localStorage.getItem('police_data') ? localStorage.getItem('police_data') as string : '[]';
  return (
    <div className="App">
      <ParentSize>{({ width, height }) => <Model width={width} height={height} />}</ParentSize>
    </div>
  );
}

export default App;
