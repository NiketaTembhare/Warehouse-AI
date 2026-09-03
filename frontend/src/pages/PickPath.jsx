import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function PickPath() {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [data, setData] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);
  const [hoveredStep, setHoveredStep] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      setError('');
      try {
        const res = await client.get('/pickpath/orders');
        const orderList = res.data?.orders || (Array.isArray(res.data) ? res.data : []);
        setOrders(orderList);
        if (orderList.length > 0) {
          const firstId = orderList[0].order_id;
          setSelectedOrderId(firstId);
          fetchPickPath(firstId);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load order list from server.");
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, []);

  const fetchPickPath = async (orderId) => {
    if (!orderId) return;
    setLoadingRoute(true);
    setError('');
    setSelectedStep(null);
    setHoveredStep(null);

    try {
      const res = await client.post('/pickpath', { order_id: orderId });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Error running pick path optimization analysis.");
      setData(null);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSelectChange = (e) => {
    const newOrderId = e.target.value;
    setSelectedOrderId(newOrderId);
    fetchPickPath(newOrderId);
  };

  const getStepIcon = (nodeId) => {
    if (nodeId === 'RECEIVE') return '📥';
    if (nodeId === 'PACK') return '📤';
    return '📦';
  };

  // Aisles configuration mapping coordinates to physical layout
  const aisles = [
    { name: 'AISLE A', zone: 'Fast Zone', color: '#6366f1', rowY: 105, letter: 'A' },
    { name: 'AISLE B', zone: 'Fast Zone', color: '#6366f1', rowY: 180, letter: 'B' },
    { name: 'AISLE C', zone: 'Medium Zone', color: '#10b981', rowY: 255, letter: 'C' },
    { name: 'AISLE D', zone: 'Slow Zone', color: '#f59e0b', rowY: 330, letter: 'D' },
    { name: 'AISLE E', zone: 'Bulk Zone', color: '#64748b', rowY: 405, letter: 'E' },
  ];

  // Precision 2D Coordinate Mapper for 10-column warehouse grid
  // X: Docks at 75px. Walkway line at 165px. Aisle Name Badges at 180px (width 90px). Bin 1 starts at 320px!
  const getCanvasCoords = (nodeId, xVal, yVal) => {
    if (nodeId === 'RECEIVE') {
      return { x: 75, y: 45 };
    }
    if (nodeId === 'PACK') {
      return { x: 75, y: 435 };
    }

    let aisleY = 105;
    if (nodeId.startsWith('A')) aisleY = 105;
    else if (nodeId.startsWith('B')) aisleY = 180;
    else if (nodeId.startsWith('C')) aisleY = 255;
    else if (nodeId.startsWith('D')) aisleY = 330;
    else if (nodeId.startsWith('E')) aisleY = 405;

    let binNum = parseInt(nodeId.replace(/\D/g, ''), 10) || 1;
    if (binNum < 1) binNum = 1;
    if (binNum > 10) binNum = 10;

    const startX = 320;
    const colStep = 68;
    const posX = startX + (binNum - 1) * colStep;

    return { x: posX, y: aisleY };
  };

  const getRoutePoints = () => {
    if (!data?.pick_steps) return '';
    return data.pick_steps.map((st) => {
      const pos = getCanvasCoords(st.node_id, st.x, st.y);
      return `${pos.x},${pos.y}`;
    }).join(' ');
  };

  return (
    <div style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
      
      {/* Top Banner Header with Inline Order Selector */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, margin: 0 }}>
            Pick Path Optimizer
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px', margin: 0 }}>
            Calculates the shortest walking route to fulfill selected customer orders.
          </p>
        </div>

        {/* Inline Order Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '420px', flexShrink: 0 }}>
          <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            Select Order:
          </label>
          <select 
            value={selectedOrderId}
            onChange={handleSelectChange}
            disabled={loadingOrders || orders.length === 0}
            style={{
              width: '320px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}
          >
            {loadingOrders ? (
              <option value="">Loading available orders...</option>
            ) : orders.length === 0 ? (
              <option value="">No orders found</option>
            ) : (
              orders.map((ord) => (
                <option key={ord.order_id} value={ord.order_id}>
                  {ord.order_id} — {ord.items_summary || ord.status || 'Order Items'}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--error)', color: 'var(--error)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      )}

      {loadingRoute && !data && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Calculating optimal walking path for order fulfillment...
        </div>
      )}

      {data && (
        <>
          {/* Compact 3 Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Items to Pick
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {data.total_items} items
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Across {data.total_unique_bins} bins
              </span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Optimized Distance
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {data.optimized_distance_m}m
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                Without AI: {data.baseline_distance_m}m
              </span>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 700 }}>
                  Distance Saved
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)', marginTop: '2px' }}>
                  +{data.distance_saved_pct}%
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>
                ⚡ AI Path Optimized
              </span>
            </div>

          </div>

          {/* MAIN DUAL PANEL LAYOUT: 2D MAP (Left) + INTERACTIVE CHECKLIST (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px', alignItems: 'stretch', flex: 1 }}>
            
            {/* LEFT PANEL: 2D GRAPHICAL MAP CANVAS */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  2D Warehouse Layout & Route Vector
                </h2>

                {/* Map Legend */}
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6366f1' }}></span>
                    <span>Start</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                    <span>Pick Stop</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b' }}></span>
                    <span>Finish</span>
                  </div>
                </div>
              </div>

              {/* High-Resolution SVG Canvas (ViewBox: 1000 x 470) */}
              <div style={{ width: '100%', overflowX: 'auto', background: '#13151f', borderRadius: '8px', border: '1px solid var(--border)', padding: '8px' }}>
                <svg viewBox="0 0 1000 470" style={{ width: '100%', minWidth: '740px', height: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                  
                  {/* Grid Lines Pattern */}
                  <defs>
                    <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                    </pattern>
                    <marker id="greenArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                    </marker>
                  </defs>
                  <rect width="1000" height="470" fill="url(#mapGrid)" rx="6" />

                  {/* Main Walkway Boundary Line (X = 165px) */}
                  <line x1="165" y1="20" x2="165" y2="450" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeDasharray="6 4" />

                  {/* Render 5 Aisles Background Lanes */}
                  {aisles.map((aisle, idx) => (
                    <g key={idx}>
                      {/* Aisle Row Background (X = 175px to 980px) */}
                      <rect 
                        x="175" 
                        y={aisle.rowY - 22} 
                        width="805" 
                        height="44" 
                        fill="rgba(255, 255, 255, 0.015)"
                        stroke="rgba(255, 255, 255, 0.05)"
                        rx="6"
                      />
                      {/* Aisle Title Pill (X = 180px to 270px) — 50px GAP before Bin 1 (startX = 320px) */}
                      <rect x="180" y={aisle.rowY - 15} width="90" height="30" fill="rgba(30, 33, 48, 0.95)" stroke={aisle.color} strokeWidth="1.5" rx="5" />
                      <text x="225" y={aisle.rowY - 2} fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle">{aisle.name}</text>
                      <text x="225" y={aisle.rowY + 8} fill={aisle.color} fontSize="8" fontWeight="700" textAnchor="middle">{aisle.zone}</text>
                    </g>
                  ))}

                  {/* Render 50 Storage Bins (10 per aisle: Columns start cleanly at X = 320px) */}
                  {aisles.map((aisle) => (
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const binCode = `${aisle.letter}${num < 10 ? '0' + num : num}`;
                      const pos = getCanvasCoords(binCode, num, 0);
                      const isPickedBin = data.pick_steps?.some((s) => s.node_id === binCode);

                      return (
                        <g key={binCode} transform={`translate(${pos.x}, ${pos.y})`}>
                          <rect
                            x="-22"
                            y="-13"
                            width="44"
                            height="26"
                            fill={isPickedBin ? 'rgba(16, 185, 129, 0.22)' : 'rgba(26, 29, 39, 0.85)'}
                            stroke={isPickedBin ? '#10b981' : 'rgba(255, 255, 255, 0.09)'}
                            strokeWidth={isPickedBin ? '2' : '1'}
                            rx="4"
                          />
                          <text 
                            x="0" 
                            y="3" 
                            fill={isPickedBin ? '#6ee7b7' : '#64748b'} 
                            fontSize="9" 
                            fontWeight={isPickedBin ? '800' : '600'} 
                            textAnchor="middle"
                          >
                            {binCode}
                          </text>
                        </g>
                      );
                    })
                  ))}

                  {/* RECEIVING DOCK STATION (x=75, y=45) */}
                  {(() => {
                    const pos = getCanvasCoords('RECEIVE');
                    return (
                      <g transform={`translate(${pos.x}, ${pos.y})`}>
                        <rect x="-55" y="-18" width="110" height="36" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" rx="7" />
                        <text x="0" y="-2" fill="#a5b4fc" fontSize="9.5" fontWeight="800" textAnchor="middle">📥 RECEIVING DOCK</text>
                        <text x="0" y="9" fill="#818cf8" fontSize="8" fontWeight="700" textAnchor="middle">START POINT</text>
                      </g>
                    );
                  })()}

                  {/* PACKING DOCK STATION (x=75, y=435) */}
                  {(() => {
                    const pos = getCanvasCoords('PACK');
                    return (
                      <g transform={`translate(${pos.x}, ${pos.y})`}>
                        <rect x="-55" y="-18" width="110" height="36" fill="#78350f" stroke="#f59e0b" strokeWidth="2" rx="7" />
                        <text x="0" y="-2" fill="#fde68a" fontSize="9.5" fontWeight="800" textAnchor="middle">📤 PACKING DOCK</text>
                        <text x="0" y="9" fill="#fbbf24" fontSize="8" fontWeight="700" textAnchor="middle">FINISH POINT</text>
                      </g>
                    );
                  })()}

                  {/* OPTIMAL TSP WALKING ROUTE POLYLINE */}
                  <polyline
                    points={getRoutePoints()}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="7 4"
                    markerEnd="url(#greenArrow)"
                  />

                  {/* DRAW NUMBERED WAYPOINT PINS OVER PICK STOPS */}
                  {data.pick_steps && data.pick_steps.map((st) => {
                    const pos = getCanvasCoords(st.node_id, st.x, st.y);
                    const isDock = st.node_id === 'RECEIVE' || st.node_id === 'PACK';
                    const isSelected = selectedStep?.step === st.step;
                    const isHovered = hoveredStep?.step === st.step;

                    if (isDock) return null;

                    return (
                      <g 
                        key={st.step} 
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={() => setSelectedStep(st)}
                        onMouseEnter={() => setHoveredStep(st)}
                        onMouseLeave={() => setHoveredStep(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle 
                          r={isSelected || isHovered ? "15" : "12"} 
                          fill="#10b981" 
                          stroke="#ffffff" 
                          strokeWidth={isSelected ? "3" : "2"} 
                          style={{ filter: 'drop-shadow(0px 3px 8px rgba(0,0,0,0.7))', transition: 'all 0.15s ease' }}
                        />
                        <text 
                          x="0" 
                          y="4" 
                          fill="#ffffff" 
                          fontSize="10" 
                          fontWeight="900" 
                          textAnchor="middle"
                        >
                          {st.step}
                        </text>

                        {(isHovered || isSelected) && (
                          <g transform="translate(0, -28)">
                            <rect x="-50" y="-11" width="100" height="18" fill="#0f1117" stroke="#10b981" strokeWidth="1.5" rx="4" />
                            <text x="0" y="1" fill="#6ee7b7" fontSize="8.5" fontWeight="800" textAnchor="middle">
                              Stop #{st.step} · {st.node_id}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                </svg>
              </div>

            </div>

            {/* RIGHT PANEL: SINGLE ESSENTIAL PICK DIRECTIONS CHECKLIST */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Pick Directions Checklist
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '2px' }}>
                {data.pick_steps && data.pick_steps.map((step) => {
                  const isSelected = selectedStep?.step === step.step;
                  const isDock = step.node_id === 'RECEIVE' || step.node_id === 'PACK';

                  return (
                    <div 
                      key={step.step}
                      onClick={() => setSelectedStep(step)}
                      onMouseEnter={() => setHoveredStep(step)}
                      onMouseLeave={() => setHoveredStep(null)}
                      style={{
                        background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid #10b981' : '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: isDock ? (step.node_id === 'RECEIVE' ? '#6366f1' : '#f59e0b') : '#10b981',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {step.step}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>{getStepIcon(step.node_id)}</span>
                          <span>{step.node_label || `Node ${step.node_id}`}</span>
                        </div>
                        <p style={{ fontSize: '10.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.2' }}>
                          {step.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </>
      )}
    </div>
  );
}
