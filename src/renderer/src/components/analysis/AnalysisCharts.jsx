/* eslint-disable react/prop-types */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import cloud from 'd3-cloud';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

function buildHistogramBins(values, desiredBinCount = 8) {
  if (!values.length) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        index: 0,
        start: min - 0.5,
        end: max + 0.5,
        label: `${min.toFixed(2)}`,
        count: values.length
      }
    ];
  }

  const binCount = Math.max(4, Math.min(desiredBinCount, values.length));
  const width = (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => ({
    index,
    start: min + index * width,
    end: index === binCount - 1 ? max : min + (index + 1) * width,
    label: `${(min + index * width).toFixed(1)}-${(min + (index + 1) * width).toFixed(1)}`,
    count: 0
  }));

  values.forEach((value) => {
    let index = Math.floor((value - min) / width);
    if (index >= bins.length) {
      index = bins.length - 1;
    }
    bins[index].count += 1;
  });

  return bins;
}

export function EmptyChart({ message = '' }) {
  return (
    <Box
      sx={{
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1,
        p: 3,
        minHeight: 260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {message ? <Typography color="text.secondary">{message}</Typography> : null}
    </Box>
  );
}

export function ChoiceBarChart({ data }) {
  return (
    <Box sx={{ width: '100%', minWidth: 0, height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <BarChart data={data} margin={{ top: 8, right: 24, left: 4, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={72} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function NumericHistogramChart({ values }) {
  const bins = buildHistogramBins(values);

  return (
    <Box sx={{ width: '100%', minWidth: 0, height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <BarChart data={bins} margin={{ top: 8, right: 24, left: 4, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={72} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#0891b2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function TrendTooltip({ active, payload, metricLabel }) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  const formatNumber = (value) =>
    typeof value === 'number'
      ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(value)
      : '-';

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        boxShadow: 2,
        minWidth: 180
      }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
        {point.tooltipLabel}
      </Typography>
      <Typography variant="body2">{metricLabel}: {formatNumber(point.value)}</Typography>
      {point.average != null && <Typography variant="body2">Mean: {formatNumber(point.average)}</Typography>}
      {point.average != null && <Typography variant="body2">Responses: {formatNumber(point.count)}</Typography>}
      {point.median != null && <Typography variant="body2">Median: {formatNumber(point.median)}</Typography>}
      {point.min != null && point.max != null && (
        <Typography variant="body2">
          Range: {formatNumber(point.min)} - {formatNumber(point.max)}
        </Typography>
      )}
    </Box>
  );
}

export function ResponseTrendChart({ points, metricLabel }) {
  return (
    <Box sx={{ width: '100%', minWidth: 0, height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <LineChart data={points} margin={{ top: 8, right: 24, left: 8, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" minTickGap={24} />
          <YAxis
            label={{ value: metricLabel, angle: -90, position: 'insideLeft' }}
            allowDecimals
          />
          <Tooltip content={(props) => <TrendTooltip {...props} metricLabel={metricLabel} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0f766e' }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function WordCloudChart({ textValues }) {
  const wrapperRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [layoutWords, setLayoutWords] = useState([]);
  const height = 260;

  const words = useMemo(() => {
    const counts = new Map();

    textValues.forEach((value) => {
      String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 2)
        .forEach((word) => {
          counts.set(word, (counts.get(word) || 0) + 1);
        });
    });

    return [...counts.entries()]
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value || a.text.localeCompare(b.text))
      .slice(0, 80);
  }, [textValues]);

  const canLayout = words.length > 0 && width >= 120;

  useEffect(() => {
    if (!wrapperRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = Math.floor(entries[0]?.contentRect?.width || 0);
      setWidth((previous) => (previous === nextWidth ? previous : nextWidth));
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canLayout) {
      return undefined;
    }

    const max = Math.max(...words.map((item) => item.value), 1);
    const min = Math.min(...words.map((item) => item.value), max);
    const sizeRange = Math.max(max - min, 1);

    const seededRotate = (wordText) => {
      let hash = 0;
      for (let index = 0; index < wordText.length; index += 1) {
        hash = (hash << 5) - hash + wordText.charCodeAt(index);
        hash |= 0;
      }
      return Math.abs(hash) % 4 === 0 ? 90 : 0;
    };

    const layout = cloud()
      .size([width, height])
      .words(
        words.map((item) => ({
          text: item.text,
          value: item.value,
          size: 14 + ((item.value - min) / sizeRange) * 28,
          rotate: seededRotate(item.text)
        }))
      )
      .padding(2)
      .rotate((item) => item.rotate)
      .font('sans-serif')
      .fontWeight(600)
      .fontSize((item) => item.size)
      .on('end', (placedWords) => {
        setLayoutWords(placedWords);
      });

    layout.start();
    return () => layout.stop();
  }, [canLayout, height, width, words]);

  if (!words.length) {
    return <EmptyChart />;
  }

  return (
    <Box
      ref={wrapperRef}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 260 }}
    >
      <svg width="100%" height={height} viewBox={`0 0 ${Math.max(width, 1)} ${height}`}>
        <g transform={`translate(${Math.max(width, 1) / 2}, ${height / 2})`}>
          {(canLayout ? layoutWords : []).map((word) => {
            const ratio = Math.max(word.value, 1) / Math.max(words[0]?.value || 1, 1);
            const opacity = 0.45 + ratio * 0.55;

            return (
              <text
                key={word.text}
                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                textAnchor="middle"
                style={{
                  fontSize: `${word.size}px`,
                  fontWeight: 600,
                  fontFamily: 'sans-serif',
                  fill: '#4f46e5',
                  opacity
                }}
              >
                {word.text}
              </text>
            );
          })}
        </g>
      </svg>
    </Box>
  );
}

export function HeatMapChart({ rowLabels, columnLabels, points, onRowClick, onColumnClick }) {
  if (!rowLabels.length || !columnLabels.length) {
    return <EmptyChart />;
  }

  const maxCount = Math.max(...points.map((item) => item.count), 0);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `minmax(140px, auto) repeat(${columnLabels.length}, minmax(90px, 1fr))`,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{ p: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}
        />
        {columnLabels.map((label) => (
          <Box
            key={`col-${label}`}
            onClick={() => onColumnClick?.(label)}
            sx={{
              p: 1,
              borderRight: '1px solid',
              borderBottom: '1px solid',
              borderColor: 'divider',
              cursor: onColumnClick ? 'pointer' : 'default',
              '&:hover': onColumnClick ? { backgroundColor: 'action.hover' } : {}
            }}
          >
            <Typography variant="caption" fontWeight={600}>
              {label}
            </Typography>
          </Box>
        ))}
        {rowLabels.map((rowLabel) => (
          <Fragment key={`row-${rowLabel}`}>
            <Box
              onClick={() => onRowClick?.(rowLabel)}
              sx={{
                p: 1,
                borderRight: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': onRowClick ? { backgroundColor: 'action.hover' } : {}
              }}
            >
              <Typography variant="caption" fontWeight={600}>
                {rowLabel}
              </Typography>
            </Box>
            {columnLabels.map((columnLabel) => {
              const entry = points.find(
                (item) => item.rowLabel === rowLabel && item.columnLabel === columnLabel
              );
              const count = entry?.count || 0;
              const intensity = maxCount ? count / maxCount : 0;

              return (
                <Box
                  key={`${rowLabel}::${columnLabel}`}
                  sx={{
                    p: 1,
                    borderRight: '1px solid',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: `rgba(79, 70, 229, ${0.08 + intensity * 0.7})`,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body2">{count}</Typography>
                </Box>
              );
            })}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}

export function ScatterComparisonChart({ points }) {
  if (!points.length) {
    return <EmptyChart />;
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0, height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" name="Question A" type="number" />
          <YAxis dataKey="y" name="Question B" type="number" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={points} fill="#7c3aed" />
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function StackedHistogramChart({ values }) {
  const allValues = values.map((item) => item.value);
  if (!allValues.length) {
    return <EmptyChart />;
  }

  const bins = buildHistogramBins(allValues).map((bin) => ({ ...bin }));
  const keys = [...new Set(values.map((item) => item.series))];

  bins.forEach((bin) => {
    keys.forEach((key) => {
      bin[key] = 0;
    });
  });

  values.forEach((item) => {
    const bucket = bins.find((bin) => item.value >= bin.start && item.value <= bin.end);
    if (!bucket) return;
    bucket[item.series] += 1;
  });

  const palette = ['#4f46e5', '#0ea5e9', '#16a34a', '#ea580c', '#dc2626', '#9333ea'];

  return (
    <Box sx={{ width: '100%', minWidth: 0, height: 300, minHeight: 300 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <BarChart data={bins} margin={{ top: 8, right: 24, left: 4, bottom: 64 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={72} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          {keys.map((key, index) => (
            <Bar key={key} dataKey={key} stackId="stack" fill={palette[index % palette.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

export function GeoChart({ locations }) {
  if (!locations || locations.length === 0) {
    return <EmptyChart message="No geographic data available" />;
  }

  const maxCount = Math.max(...locations.map((loc) => loc.count || 0), 1);

  // Calculate bounds for map centering
  const lats = locations.map((loc) => loc.lat);
  const lngs = locations.map((loc) => loc.lng);
  const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

  // Determine appropriate zoom level based on geographic spread
  const latRange = Math.max(...lats) - Math.min(...lats);
  const lngRange = Math.max(...lngs) - Math.min(...lngs);
  const maxRange = Math.max(latRange, lngRange);
  let zoom = 7;
  if (maxRange > 2) zoom = 6;
  if (maxRange < 0.5) zoom = 9;

  return (
    <Box sx={{ height: 340, width: '100%', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        {locations.map((location) => (
          <CircleMarker
            key={location.name}
            center={[location.lat, location.lng]}
            radius={Math.max(6, (location.count / maxCount) * 20)}
            fillColor="#0f766e"
            color="#115e59"
            weight={2}
            fillOpacity={0.7}
          >
            <Popup>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {location.name}
              </Typography>
              <Typography variant="caption" display="block">
                Responses: {location.count}
              </Typography>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </Box>
  );
}
