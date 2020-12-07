import * as React from 'react';
import { useState, useEffect } from 'react';
import Pie, { ProvidedProps, PieArcDatum } from "@visx/shape/lib/shapes/Pie";
import { scaleOrdinal } from "@visx/scale";
import { Group } from "@visx/group";
import { GradientPurpleRed } from "@visx/gradient";
import { animated, useTransition, interpolate } from "react-spring";
import * as Papa from 'papaparse'

import rawFile from './CCRB_database_raw.csv'

interface AllegationFrequency {
  [propName: string]: number;
}

interface Allegation {
  label: string,
  frequency: number
}

// accessor function
const frequency = (d: Allegation) => d.frequency;

const defaultMargin = { top: 20, right: 20, bottom: 20, left: 20 };

export type PieProps = {
  width: number;
  height: number;
  margin?: typeof defaultMargin;
  animate?: boolean;
};

export default function Model({
  width,
  height,
  margin = defaultMargin,
  animate = true
}: PieProps) {
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [rawData, setRawData] = useState([] as any[]);
  const [substantiatedData, setSubstantiatedData] = useState([] as any[]);
  const [frequencyData, setFrequencyData] = useState([] as Allegation[]);
  const [isLoaded, setIsLoaded] = useState(false);

  const ranks = frequencyData.map((f: any) => f.label)
  const getRankColor = scaleOrdinal({
    domain: ranks,
    range: Array(ranks.length)
      .fill(0)
      .map(
        (_, i: number) =>
          "rgba(0,0,0," + (0.7 / ranks.length) * (i + 1) + ")"
      )
  });

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = 50;

  useEffect(() => {
    if(!isLoaded) {
      Papa.parse(rawFile, {
      	download: true,
        header: true,
        // worker: true,
      	complete: (results : {data : any[]}) => {
          // localStorage.setItem('police_data', JSON.stringify(results.data))
          setRawData(results.data)

          const filtered = results.data.filter((cell : any) => cell["Board Disposition"] &&  cell["Board Disposition"].includes("Substantiated"))
          const allegationFrequencies : AllegationFrequency = {}

          filtered.forEach((cell: any) => {
            if(allegationFrequencies[cell["Rank"]]) {
              allegationFrequencies[cell["Rank"]]++
            }else {
              allegationFrequencies[cell["Rank"]] = 1
            }
          })

          const allegations : Allegation[] = Object.keys(allegationFrequencies).map(key => ({
            label: key,
            frequency: allegationFrequencies[key]
          }))

          setFrequencyData(allegations)
          setSubstantiatedData(filtered)
          setIsLoaded(true)
      	}
      });
    }
  }, [])

  if (width < 10) return null;

  return (
    <svg width={width} height={height}>
      <GradientPurpleRed id="visx-pie-gradient" />
      <rect
        rx={14}
        width={width}
        height={height}
        fill="url('#visx-pie-gradient')"
      />
      <Group top={centerY + margin.top} left={centerX + margin.left}>
        <Pie
          data={
            selectedRank
              ? frequencyData.filter(({ label }) => label === selectedRank)
              : frequencyData
          }
          pieValue={frequency}
          outerRadius={radius}
          innerRadius={radius - donutThickness}
          cornerRadius={3}
          padAngle={0.005}
        >
          {(pie) => (
            <AnimatedPie<Allegation>
              {...pie}
              animate={animate}
              getKey={(arc) => arc.data.label}
              onClickDatum={({ data: { label } }) =>
                animate &&
                setSelectedRank(
                  selectedRank && selectedRank === label ? null : label
                )
              }
              getColor={(arc) => getRankColor(arc.data.label)}
            />
          )}
        </Pie>
      </Group>
      {animate && (
        <text
          textAnchor="end"
          x={width - 16}
          y={height - 16}
          fill="white"
          fontSize={11}
          fontWeight={300}
          pointerEvents="none"
        >
          Click segments to update
        </text>
      )}
    </svg>
  );
}

// react-spring transition definitions
type AnimatedStyles = { startAngle: number; endAngle: number; opacity: number };

const fromLeaveTransition = ({ endAngle }: PieArcDatum<any>) => ({
  // enter from 360° if end angle is > 180°
  startAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  endAngle: endAngle > Math.PI ? 2 * Math.PI : 0,
  opacity: 0
});
const enterUpdateTransition = ({ startAngle, endAngle }: PieArcDatum<any>) => ({
  startAngle,
  endAngle,
  opacity: 1
});

type AnimatedPieProps<Datum> = ProvidedProps<Datum> & {
  animate?: boolean;
  getKey: (d: PieArcDatum<Datum>) => string;
  getColor: (d: PieArcDatum<Datum>) => string;
  onClickDatum: (d: PieArcDatum<Datum>) => void;
  delay?: number;
};

function AnimatedPie<Datum>({
  animate,
  arcs,
  path,
  getKey,
  getColor,
  onClickDatum
}: AnimatedPieProps<Datum>) {
  const transitions = useTransition<PieArcDatum<Datum>, AnimatedStyles>(
    arcs,
    getKey,
    // @ts-ignore react-spring doesn't like this overload
    {
      from: animate ? fromLeaveTransition : enterUpdateTransition,
      enter: enterUpdateTransition,
      update: enterUpdateTransition,
      leave: animate ? fromLeaveTransition : enterUpdateTransition
    }
  );
  return (
    <>
      {transitions.map(
        ({
          item: arc,
          props,
          key
        }: {
          item: PieArcDatum<Datum>;
          props: AnimatedStyles;
          key: string;
        }) => {
          const [centroidX, centroidY] = path.centroid(arc);
          const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;

          return (
            <g key={key}>
              <animated.path
                // compute interpolated path d attribute from intermediate angle values
                d={interpolate(
                  [props.startAngle, props.endAngle],
                  (startAngle, endAngle) =>
                    path({
                      ...arc,
                      startAngle,
                      endAngle
                    })
                )}
                fill={getColor(arc)}
                onClick={() => onClickDatum(arc)}
                onTouchStart={() => onClickDatum(arc)}
              />
              {hasSpaceForLabel && (
                <animated.g style={{ opacity: props.opacity }}>
                  <text
                    fill="white"
                    x={centroidX}
                    y={centroidY}
                    dy=".03em"
                    fontSize={14}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {getKey(arc)}
                  </text>
                </animated.g>
              )}
            </g>
          );
        }
      )}
    </>
  );
}
