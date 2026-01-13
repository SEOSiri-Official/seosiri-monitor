import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
const res = await axios.get(`${API_BASE_URL}/api/report/${id}`, {
          withCredentials: true,
        timeout: 30000
      });
      
      if (!res.data) throw new Error('No data received');
      
      setData({
        url: res.data.url || 'Unknown',
        external: Array.isArray(res.data.external) ? res.data.external : [],
        internal: Array.isArray(res.data.internal) ? res.data.internal : [],
        stats: res.data.stats || {},
        verifiedAt: res.data.verifiedAt || null,
        contacts: res.data.contacts || []
      });
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const analyzeData = () => {
    if (!data) return null;
    
    // Separate real vs projected backlinks
    const realBacklinks = data.external.filter(link => 
      link.status === "🟢 LIVE" || link.status === "LIVE"
    );
    
    const projectedBacklinks = data.external.filter(link =>
      link.status === "UNSTABLE" || link.status === "POTENTIAL"
    );
    
    const lostBacklinks = data.external.filter(link =>
      link.status === "LOST" || link.status === "❌ LOST"
    );
    
    // Separate internal links
    const workingInternal = data.internal.filter(l => 
      l.status.includes('OK') || l.status.includes('✅')
    );
    const brokenInternal = data.internal.filter(l => 
      l.status.includes('BROKEN') || l.status.includes('❌')
    );
    
    // Calculate values
    const realValue = realBacklinks.reduce((acc, link) => 
      acc + parseInt(link.value?.toString().replace(/\D/g, '') || '0'), 0
    );
    
    const lostValue = lostBacklinks.reduce((acc, link) =>
      acc + parseInt(link.value?.toString().replace(/\D/g, '') || '0'), 0
    );
    
    const potentialValue = projectedBacklinks.reduce((acc, link) =>
      acc + parseInt(link.value?.toString().replace(/\D/g, '') || '0'), 0
    );
    
    // MEANINGFUL RISK SCORE
    let riskScore = 0;
    let riskFactors = [];
    
    // Factor 1: Backlink quantity (30%)
    if (realBacklinks.length < 5) {
      riskScore += 30;
      riskFactors.push(`Only ${realBacklinks.length} verified backlinks`);
    } else if (realBacklinks.length < 15) {
      riskScore += 15;
      riskFactors.push(`Limited backlink diversity (${realBacklinks.length})`);
    }
    
    // Factor 2: Lost links (25%)
    if (lostBacklinks.length > 0) {
      riskScore += Math.min(25, lostBacklinks.length * 5);
      riskFactors.push(`${lostBacklinks.length} backlinks lost recently`);
    }
    
    // Factor 3: Broken internal links (25%)
    if (brokenInternal.length > 0) {
      const brokenPercent = (brokenInternal.length / data.internal.length) * 100;
      riskScore += Math.min(25, Math.round(brokenPercent));
      riskFactors.push(`${brokenInternal.length} broken internal links`);
    }
    
    // Factor 4: Link authority (20%)
    const avgDA = realBacklinks.length > 0
      ? realBacklinks.reduce((acc, l) => acc + (l.da || 0), 0) / realBacklinks.length
      : 0;
    
    if (avgDA < 50) {
      riskScore += 20;
      riskFactors.push(`Low average authority (DA ${Math.round(avgDA)})`);
    } else if (avgDA < 70) {
      riskScore += 10;
      riskFactors.push(`Moderate authority (DA ${Math.round(avgDA)})`);
    }
    
    riskScore = Math.min(95, Math.max(5, riskScore));
    
    return {
      realBacklinks,
      projectedBacklinks,
      lostBacklinks,
      workingInternal,
      brokenInternal,
      realValue,
      lostValue,
      potentialValue,
      totalValue: realValue + potentialValue,
      riskScore,
      riskFactors,
      avgDA: Math.round(avgDA),
      healthScore: data.internal.length > 0
        ? Math.round((workingInternal.length / data.internal.length) * 100)
        : 100
    };
  };

  if (loading) {
    return (
      <div style={{padding: '60px', textAlign: 'center', fontFamily: 'Segoe UI', maxWidth: '600px', margin: '0 auto'}}>
        <div style={{width: '80px', height: '80px', border: '8px solid #f3f3f3', borderTop: '8px solid #2962ff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 30px'}}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <h2 style={{color: '#333'}}>🕷️ Deep Crawl In Progress...</h2>
        <p style={{fontSize: '16px', color: '#666'}}>Analyzing 50+ internal links & discovering hidden backlinks</p>
        <div style={{background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginTop: '20px', textAlign: 'left'}}>
          <p style={{margin: '5px 0', fontSize: '14px'}}>✓ Scanning major search engines</p>
          <p style={{margin: '5px 0', fontSize: '14px'}}>✓ Checking web archives</p>
          <p style={{margin: '5px 0', fontSize: '14px'}}>✓ Analyzing site structure</p>
          <p style={{margin: '5px 0', fontSize: '14px'}}>✓ Testing internal links</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{padding: '60px', textAlign: 'center', fontFamily: 'Segoe UI'}}>
        <div style={{fontSize: '80px'}}>❌</div>
        <h2 style={{color: '#d32f2f'}}>Report Not Found</h2>
        <p style={{color: '#666'}}>{error}</p>
        <button onClick={() => navigate('/')} style={{padding: '12px 24px', background: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '20px'}}>
          ← Back to Home
        </button>
      </div>
    );
  }

  if (!data) return null;

  const analysis = analyzeData();
  
  return (
    <div style={{fontFamily: 'Segoe UI', maxWidth: '1200px', margin: '40px auto', padding: '20px', color: '#333'}}>
      
      {/* Header */}
      <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', borderRadius: '12px', marginBottom: '30px', color: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'}}>
        <h1 style={{margin: '0 0 10px 0', fontSize: '32px'}}>🕷️ SEOSiri Backlink Report</h1>
        <p style={{margin: '0 0 5px 0', fontSize: '20px', opacity: 0.9}}><strong>{data.url}</strong></p>
        {data.verifiedAt && (
          <p style={{margin: 0, fontSize: '14px', opacity: 0.8}}>
            Scan Date: {new Date(data.verifiedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Alert: Lost Links */}
      {analysis.lostBacklinks.length > 0 && (
        <div style={{background: '#ffebee', padding: '20px', borderRadius: '10px', marginBottom: '25px', border: '2px solid #ef5350'}}>
          <h3 style={{margin: '0 0 10px 0', color: '#c62828'}}>
            🚨 ALERT: {analysis.lostBacklinks.length} Backlinks Lost!
          </h3>
          <p style={{margin: 0, color: '#666'}}>
            These high-value backlinks were detected in our database but are no longer active. 
            Estimated loss: <strong style={{color: '#d32f2f'}}>${analysis.lostValue}</strong>
          </p>
        </div>
      )}

      {/* Key Metrics Dashboard */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        
        {/* Real Backlinks */}
        <div style={{background: '#e8f5e9', padding: '25px', borderRadius: '12px', border: '2px solid #66bb6a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
          <h4 style={{margin: '0 0 10px 0', color: '#2e7d32', fontSize: '13px', textTransform: 'uppercase'}}>✅ Verified Links</h4>
          <div style={{fontSize: '42px', fontWeight: 'bold', color: '#1b5e20'}}>{analysis.realBacklinks.length}</div>
          <p style={{margin: '5px 0 0', fontSize: '13px', color: '#666'}}>Avg DA: {analysis.avgDA}</p>
        </div>

        {/* Real Value */}
        <div style={{background: '#e3f2fd', padding: '25px', borderRadius: '12px', border: '2px solid #42a5f5', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
          <h4 style={{margin: '0 0 10px 0', color: '#1565c0', fontSize: '13px', textTransform: 'uppercase'}}>💎 Secured Value</h4>
          <div style={{fontSize: '42px', fontWeight: 'bold', color: '#0d47a1'}}>${analysis.realValue}</div>
          <p style={{margin: '5px 0 0', fontSize: '13px', color: '#666'}}>From active links</p>
        </div>

        {/* Risk Score */}
        <div style={{background: analysis.riskScore > 50 ? '#ffebee' : '#fff3e0', padding: '25px', borderRadius: '12px', border: `2px solid ${analysis.riskScore > 50 ? '#ef5350' : '#ffa726'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
          <h4 style={{margin: '0 0 10px 0', color: analysis.riskScore > 50 ? '#c62828' : '#e65100', fontSize: '13px', textTransform: 'uppercase'}}>⚠️ Risk Score</h4>
          <div style={{fontSize: '42px', fontWeight: 'bold', color: analysis.riskScore > 50 ? '#b71c1c' : '#ef6c00'}}>{analysis.riskScore}%</div>
          <div style={{height: '8px', background: '#ddd', borderRadius: '4px', marginTop: '10px', overflow: 'hidden'}}>
            <div style={{width: `${analysis.riskScore}%`, height: '100%', background: analysis.riskScore > 50 ? '#d32f2f' : '#ff9800', transition: 'width 0.5s ease'}}></div>
          </div>
        </div>

        {/* Site Health */}
        <div style={{background: analysis.brokenInternal.length > 0 ? '#fff3e0' : '#f1f8e9', padding: '25px', borderRadius: '12px', border: `2px solid ${analysis.brokenInternal.length > 0 ? '#ffa726' : '#9ccc65'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
          <h4 style={{margin: '0 0 10px 0', color: analysis.brokenInternal.length > 0 ? '#e65100' : '#558b2f', fontSize: '13px', textTransform: 'uppercase'}}>🏥 Site Health</h4>
          <div style={{fontSize: '42px', fontWeight: 'bold', color: analysis.brokenInternal.length > 0 ? '#ef6c00' : '#33691e'}}>{analysis.healthScore}%</div>
          <p style={{margin: '5px 0 0', fontSize: '13px', color: '#666'}}>
            {analysis.brokenInternal.length} broken / {data.internal.length} total
          </p>
        </div>
      </div>

      {/* Risk Analysis */}
      {analysis.riskFactors.length > 0 && (
        <div style={{background: '#fff3e0', padding: '25px', borderRadius: '10px', marginBottom: '30px', border: '2px solid #ffa726'}}>
          <h3 style={{margin: '0 0 15px 0', color: '#e65100'}}>📋 Risk Analysis</h3>
          <ul style={{margin: 0, paddingLeft: '20px'}}>
            {analysis.riskFactors.map((factor, i) => (
              <li key={i} style={{marginBottom: '8px', color: '#666', fontSize: '15px'}}>{factor}</li>
            ))}
          </ul>
          <div style={{marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px'}}>
            <strong style={{color: '#ef6c00'}}>💡 Recommendations:</strong>
            <ul style={{margin: '10px 0 0 0', paddingLeft: '20px', color: '#666'}}>
              {analysis.realBacklinks.length < 15 && <li>Build 10+ quality backlinks from high-DA sources</li>}
              {analysis.brokenInternal.length > 0 && <li>Fix {analysis.brokenInternal.length} broken internal links immediately</li>}
              {analysis.lostBacklinks.length > 0 && <li>Contact {analysis.lostBacklinks.length} sites to restore lost backlinks</li>}
              {analysis.avgDA < 60 && <li>Target DA 70+ websites for new backlinks</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Lost Backlinks Section */}
      {analysis.lostBacklinks.length > 0 && (
        <>
          <h3 style={{marginBottom: '15px', color: '#d32f2f'}}>
            ❌ Lost Backlinks ({analysis.lostBacklinks.length}) - Value Lost: ${analysis.lostValue}
          </h3>
          <div style={{boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '30px', border: '2px solid #ef5350'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead style={{background: '#c62828', color: 'white'}}>
                <tr>
                  <th style={{padding: '15px', textAlign: 'left'}}>Lost Source</th>
                  <th style={{padding: '15px', width: '180px'}}>Type</th>
                  <th style={{padding: '15px', width: '80px'}}>DA</th>
                  <th style={{padding: '15px', width: '100px'}}>Value</th>
                  <th style={{padding: '15px', width: '120px'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {analysis.lostBacklinks.map((link, i) => (
                  <tr key={i} style={{background: i % 2 === 0 ? '#ffebee' : '#fff', borderBottom: '1px solid #ef9a9a'}}>
                    <td style={{padding: '15px', fontSize: '14px', wordBreak: 'break-all'}}>
                      <a href={link.source} target="_blank" rel="noopener noreferrer" style={{color: '#c62828', textDecoration: 'none'}}>
                        {link.source}
                      </a>
                    </td>
                    <td style={{padding: '15px', fontSize: '14px'}}>{link.type}</td>
                    <td style={{padding: '15px', textAlign: 'center'}}>
                      <span style={{background: '#ffcdd2', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold'}}>{link.da}</span>
                    </td>
                    <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#c62828'}}>{link.value}</td>
                    <td style={{padding: '15px', textAlign: 'center'}}>
                      <button style={{padding: '6px 12px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold'}}>
                        Recover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Active Backlinks */}
      <h3 style={{marginBottom: '15px'}}>
        ✅ Active Backlinks ({analysis.realBacklinks.length}) - Total Value: ${analysis.realValue}
      </h3>
      {analysis.realBacklinks.length === 0 ? (
        <div style={{background: '#fff3e0', padding: '30px', borderRadius: '12px', textAlign: 'center', marginBottom: '30px'}}>
          <div style={{fontSize: '48px'}}>🔍</div>
          <h3 style={{color: '#e65100', margin: '10px 0'}}>No Active Backlinks Found</h3>
          <p style={{color: '#666'}}>This is critical - your site needs backlinks to rank. Start building quality links immediately.</p>
        </div>
      ) : (
        <div style={{boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '30px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead style={{background: '#263238', color: 'white'}}>
              <tr>
                <th style={{padding: '15px', textAlign: 'left'}}>Source URL</th>
                <th style={{padding: '15px', width: '180px'}}>Type</th>
                <th style={{padding: '15px', width: '80px'}}>DA</th>
                <th style={{padding: '15px', width: '100px'}}>Value</th>
                <th style={{padding: '15px', width: '100px'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {analysis.realBacklinks.map((link, i) => (
                <tr key={i} style={{background: i % 2 === 0 ? 'white' : '#f9f9f9', borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '15px', fontSize: '14px', wordBreak: 'break-all'}}>
                    <a href={link.source} target="_blank" rel="noopener noreferrer" style={{color: '#0277bd', textDecoration: 'none'}}>
                      {link.source}
                    </a>
                  </td>
                  <td style={{padding: '15px', fontSize: '14px'}}>{link.type}</td>
                  <td style={{padding: '15px', textAlign: 'center'}}>
                    <span style={{background: '#e0f7fa', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold'}}>{link.da}</span>
                  </td>
                  <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#2e7d32'}}>{link.value}</td>
                  <td style={{padding: '15px', textAlign: 'center', color: '#4caf50', fontWeight: 'bold', fontSize: '14px'}}>
                    🟢 LIVE
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Potential/Unstable Backlinks */}
      {analysis.projectedBacklinks.length > 0 && (
        <>
          <h3 style={{marginBottom: '15px', color: '#ff9800'}}>
            🔮 Potential Backlinks ({analysis.projectedBacklinks.length}) - Est. Value: ${analysis.potentialValue}
          </h3>
          <div style={{background: '#fff3e0', padding: '20px', borderRadius: '10px', marginBottom: '15px'}}>
            <p style={{margin: 0, fontSize: '14px', color: '#666'}}>
              <strong>Note:</strong> These are deep-scan results or historically detected links that may be unstable or require verification. 
              Upgrade to Pro for continuous monitoring and alerts.
            </p>
          </div>
          <div style={{boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '30px', opacity: 0.8}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead style={{background: '#f57c00', color: 'white'}}>
                <tr>
                  <th style={{padding: '15px', textAlign: 'left'}}>Source</th>
                  <th style={{padding: '15px', width: '180px'}}>Type</th>
                  <th style={{padding: '15px', width: '80px'}}>DA</th>
                  <th style={{padding: '15px', width: '100px'}}>Value</th>
                  <th style={{padding: '15px', width: '120px'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.projectedBacklinks.map((link, i) => (
                  <tr key={i} style={{background: i % 2 === 0 ? '#fff8e1' : '#fff', borderBottom: '1px solid #ffe0b2'}}>
                    <td style={{padding: '15px', fontSize: '14px', wordBreak: 'break-all', color: '#666'}}>{link.source}</td>
                    <td style={{padding: '15px', fontSize: '14px'}}>{link.type}</td>
                    <td style={{padding: '15px', textAlign: 'center'}}>
                      <span style={{background: '#ffe0b2', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold'}}>{link.da}</span>
                    </td>
                    <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#ef6c00'}}>{link.value}</td>
                    <td style={{padding: '15px', textAlign: 'center', color: '#ff9800', fontWeight: 'bold', fontSize: '13px'}}>
                      ⚠️ {link.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Broken Internal Links (if any) */}
      {analysis.brokenInternal.length > 0 && (
        <>
          <h3 style={{marginBottom: '15px', color: '#d32f2f'}}>
            ❌ Broken Internal Links ({analysis.brokenInternal.length}) - Fix Immediately!
          </h3>
          <div style={{boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '30px', border: '2px solid #ef5350'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead style={{background: '#c62828', color: 'white'}}>
                <tr>
                  <th style={{padding: '15px', textAlign: 'left'}}>Internal URL</th>
                  <th style={{padding: '15px', width: '120px'}}>HTTP Code</th>
                  <th style={{padding: '15px', width: '150px'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {analysis.brokenInternal.map((link, i) => (
                  <tr key={i} style={{background: '#ffebee', borderBottom: '1px solid #ef9a9a'}}>
                    <td style={{padding: '15px', fontSize: '14px', wordBreak: 'break-all', color: '#333'}}>{link.url}</td>
                    <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold'}}>
                      <span style={{background: '#ffcdd2', padding: '5px 12px', borderRadius: '20px', color: '#c62828'}}>{link.code}</span>
                    </td>
                    <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#d32f2f', fontSize: '14px'}}>
                      ❌ BROKEN
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Working Internal Links */}
      <h3 style={{marginBottom: '15px'}}>✅ Working Internal Links ({analysis.workingInternal.length})</h3>
      <div style={{boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '40px'}}>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead style={{background: '#455a64', color: 'white'}}>
            <tr>
              <th style={{padding: '15px', textAlign: 'left'}}>Internal URL</th>
              <th style={{padding: '15px', width: '120px'}}>HTTP Code</th>
              <th style={{padding: '15px', width: '150px'}}>Status</th>
            </tr>
          </thead>
          <tbody>
            {analysis.workingInternal.slice(0, 15).map((link, i) => (
              <tr key={i} style={{background: i % 2 === 0 ? 'white' : '#f9f9f9', borderBottom: '1px solid #eee'}}>
                <td style={{padding: '15px', fontSize: '14px', wordBreak: 'break-all'}}>{link.url}</td>
                <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold'}}>
                  <span style={{background: '#e8f5e9', padding: '5px 12px', borderRadius: '20px', color: '#2e7d32'}}>{link.code}</span>
                </td>
                <td style={{padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#4caf50', fontSize: '14px'}}>
                  ✅ Working
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {analysis.workingInternal.length > 15 && (
          <div style={{padding: '15px', textAlign: 'center', background: '#f5f5f5', borderTop: '1px solid #ddd'}}>
            <p style={{margin: 0, color: '#666'}}>+ {analysis.workingInternal.length - 15} more working links</p>
          </div>
        )}
      </div>

      {/* Upgrade CTA */}
      <div style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px', borderRadius: '12px', textAlign: 'center', color: 'white', marginBottom: '40px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)'}}>
        <h3 style={{margin: '0 0 15px 0', fontSize: '28px'}}>🚀 Unlock Full Monitoring</h3>
        <p style={{margin: '0 0 25px 0', fontSize: '16px', opacity: 0.9}}>
          Track lost links in real-time &bull; Get instant email alerts &bull; Export full reports &bull; Monitor competitors
        </p>
        <button style={{padding: '15px 40px', background: 'white', color: '#764ba2', border: 'none', borderRadius: '30px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'}}>
          Upgrade to Pro - $19/mo
        </button>
        <p style={{margin: '15px 0 0 0', fontSize: '12px', opacity: 0.8}}>
          ✓ 30-day money-back guarantee &bull; Cancel anytime
        </p>
      </div>

      {/* Footer Actions */}
      <div style={{textAlign: 'center', padding: '30px', background: '#f5f5f5', borderRadius: '10px'}}>
        <button onClick={() => navigate('/')} style={{padding: '12px 30px', background: '#666', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', marginRight: '10px'}}>
          ← Monitor Another Site
        </button>
        <button onClick={() => window.print()} style={{padding: '12px 30px', background: '#2962ff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px'}}>
          🖨️ Print Report
        </button>
      </div>
    </div>
  );
}

export default Report;