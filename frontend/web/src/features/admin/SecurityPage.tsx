import { useEffect, useMemo, useState } from 'react';
import { useSecurity, banDuration, type Attempt } from './securityStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, toast } from '@/components/ui';

const SESSIONS_PER_PAGE = 5;

export default function SecurityPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { sessions, blockedIps, attempts, forceLogout, revokeAll, unblockIp } = useSecurity();

  const [sessionsPage, setSessionsPage] = useState(1);

  const failedCount = useMemo(
    () => attempts.filter((a) => a.result === 'Failed').length,
    [attempts]
  );

  const totalSessionPages = Math.max(
    1,
    Math.ceil(sessions.length / SESSIONS_PER_PAGE)
  );

  const paginatedSessions = sessions.slice(
    (sessionsPage - 1) * SESSIONS_PER_PAGE,
    sessionsPage * SESSIONS_PER_PAGE
  );

  const firstSessionNumber =
    sessions.length === 0 ? 0 : (sessionsPage - 1) * SESSIONS_PER_PAGE + 1;

  const lastSessionNumber = Math.min(
    sessionsPage * SESSIONS_PER_PAGE,
    sessions.length
  );

  useEffect(() => {
    if (sessionsPage > totalSessionPages) {
      setSessionsPage(totalSessionPages);
    }
  }, [sessionsPage, totalSessionPages]);

  const resultBadge = (r: Attempt['result']) => {
    if (r === 'Success') return { label: 'Success', tone: 'green' as const };
    if (r === 'Blocked') return { label: 'Blocked', tone: 'red' as const };
    return { label: `Failed ×${failedCount}`, tone: 'red' as const };
  };

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-end',
          marginBottom: isMobile ? 14 : 18,
          gap: 10,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div>
          <div
            style={{
              fontSize: isMobile ? 10 : 11,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--blue)',
              fontWeight: 600,
              marginBottom: isMobile ? 4 : 6,
            }}
          >
            Trust &amp; safety
          </div>

          <h2
            className="display"
            style={{
              fontSize: isMobile ? 19 : 22,
              margin: 0,
              color: 'var(--ink)',
              fontWeight: 800,
            }}
          >
            Security &amp; sessions
          </h2>

          <p
            style={{
              margin: '2px 0 0',
              color: 'var(--ink-soft)',
              fontSize: isMobile ? 12 : 13,
            }}
          >
            Monitor authentication, force logouts, and block suspicious sources.
          </p>
        </div>
      </div>

      {/* KPI stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 10 : 12,
          marginBottom: isMobile ? 14 : 20,
        }}
      >
        {[
          { label: 'Failed logins (24h)', value: failedCount, color: 'var(--red)', delta: '▲ from 21' },
          { label: 'Active sessions', value: sessions.length, color: 'var(--green)' },
          { label: 'Blocked IPs', value: blockedIps.length, color: 'var(--blue-deep)' },
          { label: '2FA coverage', value: '68%', color: 'var(--amber)', delta: '▲ 4%' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--radius)',
              padding: isMobile ? '10px 14px' : '12px 16px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 10 : 10.5,
                fontWeight: 600,
                color: 'var(--ink-faint)',
                marginBottom: 2,
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}
            >
              {s.label}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <div
                className="mono"
                style={{
                  fontSize: isMobile ? 18 : 20,
                  fontWeight: 800,
                  color: s.color,
                }}
              >
                {s.value}
              </div>

              {s.delta && (
                <span
                  style={{
                    fontSize: isMobile ? 10 : 11,
                    color: s.color,
                    fontWeight: 600,
                  }}
                >
                  {s.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .sf-sec-card { transition: box-shadow .2s, transform .2s; }
        .sf-sec-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-sec-row { transition: background .12s; }
        .sf-sec-row:hover { background: var(--paper); }
        .sf-session-page-btn:hover:not(:disabled) { background: var(--paper-dim); }
        @media (prefers-reduced-motion: reduce) {
          .sf-sec-card, .sf-sec-row { transition: none; }
          .sf-sec-card:hover { transform: none; }
        }
      `}</style>

      {/* Sessions + Blocked IPs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
          gap: isMobile ? 14 : 18,
          marginBottom: isMobile ? 14 : 18,
        }}
      >
        {/* Active sessions */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: isMobile ? '14px 16px' : '16px 20px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 14 : 15,
                  color: 'var(--ink)',
                }}
              >
                Active sessions
              </h3>

              {sessions.length > 0 && (
                <p
                  style={{
                    margin: '3px 0 0',
                    color: 'var(--ink-faint)',
                    fontSize: isMobile ? 11.5 : 12,
                  }}
                >
                  Showing {firstSessionNumber}-{lastSessionNumber} of {sessions.length}
                </p>
              )}
            </div>

            {sessions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  revokeAll();
                  setSessionsPage(1);
                  toast('All sessions revoked');
                }}
              >
                Revoke all
              </Button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div
              style={{
                padding: isMobile ? 32 : 40,
                textAlign: 'center',
                color: 'var(--ink-faint)',
                fontSize: isMobile ? 13 : 13,
              }}
            >
              No active sessions.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr auto' : '1fr 1fr auto',
                  gap: 8,
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  borderBottom: '1px solid var(--line-soft)',
                  background: 'var(--paper)',
                  fontSize: isMobile ? 10.5 : 11,
                  fontWeight: 700,
                  color: 'var(--ink-faint)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                }}
              >
                <span>User</span>
                <span>IP · device</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>

              <div style={{ padding: isMobile ? 4 : 0 }}>
                {paginatedSessions.map((s, i) => (
                  <div
                    key={s.id}
                    className="sf-sec-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr auto' : '1fr 1fr auto',
                      gap: 8,
                      padding: isMobile ? '11px 12px' : '12px 16px',
                      borderBottom:
                        i < paginatedSessions.length - 1
                          ? '1px solid var(--line-soft)'
                          : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--ink)',
                          fontSize: isMobile ? 13 : 13,
                        }}
                      >
                        {s.user}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        className="mono"
                        style={{
                          fontSize: isMobile ? 12 : 11.5,
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {s.ip}
                      </div>

                      <div
                        style={{
                          fontSize: isMobile ? 11.5 : 11.5,
                          color: 'var(--ink-faint)',
                        }}
                      >
                        {s.device} · {s.started}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        forceLogout(s.id);
                        toast(`Forced logout — ${s.user}`);
                      }}
                      style={{
                        padding: isMobile ? '8px 12px' : '5px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--red)',
                        background: 'transparent',
                        fontSize: isMobile ? 12 : 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        color: 'var(--red)',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--red-soft)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Logout
                    </button>
                  </div>
                ))}
              </div>

              {sessions.length > SESSIONS_PER_PAGE && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 10,
                    padding: isMobile ? '12px' : '14px 16px',
                    borderTop: '1px solid var(--line-soft)',
                    background: 'var(--paper)',
                    flexDirection: isMobile ? 'column' : 'row',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--ink-soft)',
                      fontSize: isMobile ? 12 : 13,
                    }}
                  >
                    Page {sessionsPage} of {totalSessionPages}
                  </span>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="sf-session-page-btn"
                      disabled={sessionsPage === 1}
                      onClick={() =>
                        setSessionsPage((page) => Math.max(1, page - 1))
                      }
                      style={{
                        flex: isMobile ? 1 : undefined,
                        padding: isMobile ? '9px 12px' : '7px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                        fontSize: isMobile ? 12.5 : 12,
                        fontWeight: 600,
                        cursor: sessionsPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: sessionsPage === 1 ? 0.5 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      className="sf-session-page-btn"
                      disabled={sessionsPage === totalSessionPages}
                      onClick={() =>
                        setSessionsPage((page) =>
                          Math.min(totalSessionPages, page + 1)
                        )
                      }
                      style={{
                        flex: isMobile ? 1 : undefined,
                        padding: isMobile ? '9px 12px' : '7px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        background: 'var(--card)',
                        color: 'var(--ink)',
                        fontSize: isMobile ? 12.5 : 12,
                        fontWeight: 600,
                        cursor:
                          sessionsPage === totalSessionPages
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: sessionsPage === totalSessionPages ? 0.5 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Blocked IPs */}
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: isMobile ? '14px 16px' : '16px 20px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: isMobile ? 14 : 15,
                color: 'var(--ink)',
              }}
            >
              Blocked IPs
            </h3>
          </div>

          {blockedIps.length === 0 ? (
            <div
              style={{
                padding: isMobile ? 24 : 28,
                textAlign: 'center',
                color: 'var(--ink-faint)',
                fontSize: isMobile ? 13 : 13,
              }}
            >
              No blocked IPs.
            </div>
          ) : (
            <div style={{ padding: isMobile ? 4 : 0 }}>
              {blockedIps.map((b, i) => (
                <div
                  key={b.id}
                  className="sf-sec-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 8,
                    padding: isMobile ? '11px 12px' : '12px 16px',
                    borderBottom:
                      i < blockedIps.length - 1
                        ? '1px solid var(--line-soft)'
                        : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: 'var(--red)',
                          fontSize: isMobile ? 13 : 13,
                        }}
                      >
                        {b.ip}
                      </span>

                      <Badge tone="red">{banDuration(b.banCount)}</Badge>

                      {b.blockedAt && (
                        <span
                          style={{
                            fontSize: isMobile ? 11 : 10.5,
                            color: 'var(--ink-faint)',
                          }}
                        >
                          {b.blockedAt}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: isMobile ? 12 : 11.5,
                        color: 'var(--ink-soft)',
                        marginTop: 2,
                      }}
                    >
                      {b.reason} · ban #{b.banCount}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      unblockIp(b.id);
                      toast(`${b.ip} unblocked`);
                    }}
                    style={{
                      padding: isMobile ? '8px 12px' : '5px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      fontSize: isMobile ? 12 : 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--ink-soft)',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--paper-dim)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Auto-block criteria + escalation */}
          <div
            style={{
              padding: isMobile ? 12 : 14,
              borderTop: '1px solid var(--line)',
              background: 'var(--paper)',
            }}
          >
            <h4
              style={{
                margin: '0 0 8px',
                fontSize: isMobile ? 12.5 : 12,
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              Auto-block criteria
            </h4>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                marginBottom: 10,
              }}
            >
              {[
                { label: 'Failed logins', value: '≥5 in 15m', icon: '✕', color: 'var(--red)' },
                { label: 'Unknown accounts', value: '≥3 in 1h', icon: '?', color: 'var(--amber)' },
                { label: 'Credential stuffing', value: 'Pattern detected', icon: '⚡', color: 'var(--purple)' },
                { label: 'Known bad ranges', value: 'Threat intel feed', icon: '🛡', color: 'var(--blue-deep)' },
              ].map((r) => (
                <div
                  key={r.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: 'var(--card)',
                    border: '1px solid var(--line-soft)',
                  }}
                >
                  <span style={{ fontSize: isMobile ? 13 : 12 }}>{r.icon}</span>

                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: isMobile ? 12.5 : 12,
                        color: 'var(--ink)',
                        fontWeight: 600,
                      }}
                    >
                      {r.label}
                    </span>

                    <span
                      style={{
                        fontSize: isMobile ? 11.5 : 11,
                        color: r.color,
                        fontWeight: 700,
                      }}
                    >
                      {r.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span
                style={{
                  fontSize: isMobile ? 11.5 : 11,
                  color: 'var(--ink-faint)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Ban escalation
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: '1st offence', duration: '1hr' },
                  { label: '2nd offence', duration: '1 day' },
                  { label: '3rd offence', duration: '2 days' },
                  { label: '4th offence', duration: '4 days' },
                  { label: '5th+ offence', duration: 'Doubles each time' },
                ].map((e) => (
                  <div
                    key={e.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: isMobile ? 12 : 11.5,
                    }}
                  >
                    <span style={{ color: 'var(--ink-soft)' }}>{e.label}</span>

                    <span
                      className="mono"
                      style={{ fontWeight: 700, color: 'var(--ink)' }}
                    >
                      {e.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent login attempts */}
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line-soft)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: isMobile ? '14px 16px' : '16px 20px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? 14 : 15,
              color: 'var(--ink)',
            }}
          >
            Recent login attempts
          </h3>
        </div>

        {attempts.length === 0 ? (
          <div
            style={{
              padding: isMobile ? 32 : 40,
              textAlign: 'center',
              color: 'var(--ink-faint)',
              fontSize: 13,
            }}
          >
            No login attempts recorded.
          </div>
        ) : isMobile ? (
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attempts.map((a) => {
              const rb = resultBadge(a.result);

              return (
                <div
                  key={a.id}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}
                    >
                      {a.account}
                    </div>

                    <Badge tone={rb.tone}>{rb.label}</Badge>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                    }}
                  >
                    <span className="mono">{a.ip}</span>
                    <span>{a.when}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 80px 70px',
                gap: 8,
                padding: '10px 16px',
                borderBottom: '1px solid var(--line-soft)',
                background: 'var(--paper)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ink-faint)',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
              }}
            >
              <span>Account</span>
              <span>IP</span>
              <span>Time</span>
              <span style={{ textAlign: 'center' }}>Result</span>
            </div>

            <div style={{ padding: 0 }}>
              {attempts.map((a, i) => {
                const rb = resultBadge(a.result);

                return (
                  <div
                    key={a.id}
                    className="sf-sec-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 80px 70px',
                      gap: 8,
                      padding: '12px 16px',
                      borderBottom:
                        i < attempts.length - 1
                          ? '1px solid var(--line-soft)'
                          : 'none',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        fontSize: 13,
                        color: 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.account}
                    </div>

                    <span
                      className="mono"
                      style={{ fontSize: 12, color: 'var(--ink-soft)' }}
                    >
                      {a.ip}
                    </span>

                    <span
                      className="mono"
                      style={{ fontSize: 12, color: 'var(--ink-soft)' }}
                    >
                      {a.when}
                    </span>

                    <span style={{ textAlign: 'center' }}>
                      <Badge tone={rb.tone}>{rb.label}</Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}