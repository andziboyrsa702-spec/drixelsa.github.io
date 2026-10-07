import MediaUpload from './MediaUpload.jsx';
import { campaignAudience, scheduleUtc } from '../utils/campaignAudience.js';
import React, { useMemo, useState } from 'react';
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase-react.js';
import { useDialog } from '../components/DialogProvider.jsx';
import { useAdminData } from './useAdminData.js';
import AdminDataState from './AdminDataState.jsx';
import { EMAIL_TEMPLATES, emailHtml, emailAssetUrl } from './marketingTemplates.js';
import { marketingApi, isActiveSubscriber } from '../utils/marketingApi.js';
const base = {
  name: '',
  subject: '',
  preheader: '',
  headline: 'Built for your city.',
  body: 'A new Drixel edit has landed. Clean silhouettes, heavyweight layers and pieces made for everyday movement.',
  ctaLabel: 'Shop the collection',
  ctaUrl: 'https://drixelsa.co.za/za/w/new-featured',
  imageUrl: '/assets/campaigns/campaign-01.jpeg',
  imageAlt: 'Drixel campaign',
  secondaryImageUrl: '',
  layout: 'split',
  kicker: 'CAMPAIGN',
  templateId: 'drop',
  category: 'advertisement',
  detailLabel: 'Details',
  detail: '',
  offer: '',
  code: '',
  signature: 'The Drixel team',
  statusLabel: 'Update',
  audience: {
    kind: 'subscribers',
    source: '',
    market: '',
    purchase: 'all',
    orderStatus: ''
  },
  scheduleLocal: ''
};
const date = value => {
  const stamp = value?.seconds ? value.seconds * 1000 : Date.parse(value || '');
  return Number.isFinite(stamp) ? new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(stamp) : 'Not sent';
};
export default function EmailCampaignAdmin({
  updates = false
}) {
  const dialog = useDialog(),
    connection = useAdminData(['subscribers', 'email_campaigns', 'orders', 'operations_health']);
  const campaigns = [...(connection.data.email_campaigns || [])].filter(c => updates ? c.category === 'update' : c.category !== 'update').sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const [busy, setBusy] = useState(''),
    [mobile, setMobile] = useState(false),
    [tab, setTab] = useState('templates'),
    [group, setGroup] = useState('All'),
    [query, setQuery] = useState(''),
    [d, setD] = useState({
      ...base,
      category: updates ? 'update' : 'advertisement',
      ...(updates ? EMAIL_TEMPLATES.find(t => t.id === 'outage') : {}),
      name: ''
    }),
    [draftId, setDraftId] = useState(''),
    [testEmail, setTestEmail] = useState(''),
    [lastSaved, setLastSaved] = useState(''),
    [reconciling, setReconciling] = useState(null);
  const subs = campaignAudience(connection.data.subscribers || [], connection.data.orders || [], d.audience);
  const audienceField = (key, label, choices) => <label>{label}<select disabled={d.audience?.kind==='order_customers'&&['source','purchase'].includes(key)} value={d.audience?.[key] || ''} onChange={e => setD(v => ({
      ...v,
      audience: {
        ...v.audience,
        [key]: e.target.value
      }
    }))}>{choices.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>;
  const templates = EMAIL_TEMPLATES.filter(t => t.category === (updates ? 'update' : 'advertisement'));
  const visible = templates.filter(t => (group === 'All' || t.group === group) && `${t.name} ${t.headline} ${t.body}`.toLowerCase().includes(query.toLowerCase()));
  const html = useMemo(() => emailHtml(d), [d]);
  const previewHtml = useMemo(() => emailHtml(d, {
    assetBaseUrl: location.origin
  }), [d]);
  const field = (key, label, props = {}) => <label>{label}{props.area ? <textarea rows={props.rows || 5} value={d[key] || ''} onChange={e => setD(x => ({
      ...x,
      [key]: e.target.value
    }))} /> : <input type={props.type || 'text'} value={d[key] || ''} onChange={e => setD(x => ({
      ...x,
      [key]: e.target.value
    }))} maxLength={props.maxLength} />}</label>;
  async function discard() {
    return !d.name && !draftId || (await dialog.confirm({
      title: 'Replace this composition?',
      message: 'Save your draft first if you want to keep these edits. Choosing a template starts a new campaign.',
      confirmLabel: 'Start new campaign'
    }));
  }
  async function apply(t) {
    if (!(await discard())) return;
    setDraftId('');
    setLastSaved('');
    setD({
      ...base,
      ...t,
      name: t.name,
      templateId: t.id,
      secondaryImageUrl: t.layout === 'gallery' ? '/assets/campaigns/campaign-06.jpeg' : ''
    });
    setTab('compose');
  }
  function validate(full = false) {
    if (!d.name.trim() || !d.subject.trim()) throw Error('Add a campaign name and subject.');
    if (d.subject.length > 300) throw Error('Use an email subject of 300 characters or fewer.');
    if (full && (!d.headline.trim() || !d.body.trim())) throw Error('Complete the headline and message.');
    if (d.ctaLabel && !emailAssetUrl(d.ctaUrl)) throw Error('Add a valid http or https destination URL, or remove the button label.');
    if(d.videoUrl&&!emailAssetUrl(d.videoUrl))throw Error('Use a public HTTPS video URL.');
    for (const key of ['imageUrl', 'secondaryImageUrl']) if (d[key] && !emailAssetUrl(d[key])) throw Error('Use a valid public image URL.');
  }
  async function persist() {
    const payload = {
      ...d,
      html,
      status: 'draft',
      recipientCount: subs.length,
      updatedAt: serverTimestamp()
    };
    let id = draftId;
    if (id) await runTransaction(db, async tx => {
      const ref = doc(db, 'email_campaigns', id),
        current = await tx.get(ref);
      if (!current.exists() || current.data().status !== 'draft') throw Error('This draft is already sending or has changed. Open it again from Campaigns.');
      tx.set(ref, payload, {
        merge: true
      });
    });else {
      id = (await addDoc(collection(db, 'email_campaigns'), {
        ...payload,
        createdAt: serverTimestamp()
      })).id;
      setDraftId(id);
    }
    setLastSaved(new Date().toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit'
    }));
    return id;
  }
  async function save() {
    if (busy) return;
    try {
      validate();
      setBusy('save');
      await persist();
      dialog.toast('Campaign draft saved.', 'success');
    } catch (e) {
      dialog.toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function request(path, payload) {
    const token = await auth.currentUser.getIdToken(true);
    const response = await fetch(marketingApi(path), {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) throw Error(data.message || (response.status === 404 || response.ok ? 'Email service is unavailable. Deploy the marketing Functions and Firebase Hosting, or start the local emulator.' : 'The email request was not confirmed. Check Campaigns before retrying; the provider may have accepted it.'));
    return data;
  }
  async function test() {
    if (busy) return;
    try {
      validate(true);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) throw Error('Enter the email address for your preview.');
      setBusy('test');
      await request('/api/send-email', {
        to: [testEmail.trim()],
        subject: '[PREVIEW] ' + d.subject.slice(0, 290),
        html
      });
      dialog.toast('Preview accepted by the email provider. Check your inbox and spam folder.', 'success');
    } catch (e) {
      dialog.toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function send() {
    if (busy) return;
    try {
      validate(true);
      if (!subs.length) throw Error('There are no active subscribers. Pending and unsubscribed people are excluded.');
      const scheduledAt = d.scheduleLocal ? scheduleUtc(d.scheduleLocal) : '';
      if (!(await dialog.confirm({
        title: scheduledAt ? 'Schedule campaign' : 'Queue campaign',
        message: `Send “${d.subject}” to ${subs.length} selected recipient${subs.length === 1 ? '' : 's'}? ${scheduledAt ? 'Scheduled for ' + d.scheduleLocal.replace('T', ' ') + ' SAST.' : 'The background worker will send this campaign.'} Verify dates, availability, offer terms and links before sending.`,
        confirmLabel: 'Send campaign'
      }))) return;
      setBusy('send');
      const id = await persist(),
        result = await request('/api/queue-campaign', {
          campaignId: id,
          ...(scheduledAt ? {
            scheduledAt
          } : {})
        });
      setDraftId('');
      dialog.toast(`Campaign ${scheduledAt ? 'scheduled' : 'queued'} for ${result.recipientCount || subs.length} recipients. You can close the browser; check Campaigns for progress.`, 'success');
    } catch (e) {
      dialog.toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function loadCampaign(c) {
    if (!(await discard())) return;
    setD({
      ...base,
      ...Object.fromEntries(Object.keys(base).map(key => [key, c[key] ?? base[key]]))
    });
    setDraftId(c.status === 'draft' ? c.id : '');
    if (c.status !== 'draft') setD(v => ({
      ...v,
      scheduleLocal: ''
    }));
    setLastSaved('');
    setTab('compose');
  }
  async function cancel(c) {
    if (busy) return;
    if (!(await dialog.confirm({
      title: 'Cancel remaining messages?',
      message: 'Messages already submitted cannot be recalled. Unsubmitted batches will stop.',
      confirmLabel: 'Cancel campaign',
      danger: true
    }))) return;
    try {
      setBusy('cancel');
      await request('/api/cancel-campaign', {
        campaignId: c.id
      });
      dialog.toast('Remaining campaign batches cancelled.', 'success');
    } catch (e) {
      dialog.toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  async function reconcile(e) {
    e.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      setBusy('reconcile');
      await request('/api/reconcile-campaign', {
        campaignId: reconciling.id,
        batchIndex: Number(values.batchIndex),
        decision: values.decision,
        note: values.note,
        providerIds: values.providerIds.split(/[\s,]+/).filter(Boolean)
      });
      setReconciling(null);
      dialog.toast('Batch reconciled. Check campaign progress.', 'success');
    } catch (e) {
      dialog.toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  if (connection.error || connection.loading) return <AdminDataState {...connection} />;
  return <div className="mk-studio mk-workspace">{connection.data.operations_health?.find(x=>x.id==='campaignWorker')?.status==='failed'&&<p role="alert" className="mk-send-error">Subscriber queue is paused: {connection.data.operations_health.find(x=>x.id==='campaignWorker').lastError} Open Service Health to check the queue index before sending another campaign.</p>}<header className="mk-workspace-head"><div><p className="mk-overline">DRIXEL / {updates ? 'SERVICE COMMUNICATIONS' : 'MARKETING STUDIO'} <span className="mk-release">MKT.02</span></p><h2>{updates ? 'Keep your community informed.' : 'Make every message count.'}</h2><p>{updates ? 'Clear, considered announcements for the moments that need an update.' : 'Launches, editorial stories and offers. One creative workspace, from first draft to send.'}</p></div><div className="mk-summary"><div><strong>{subs.length}</strong><span>Selected recipients</span></div><div><strong>{templates.length}</strong><span>{updates ? 'Update' : 'Advertisement'} templates</span></div><div><strong>{campaigns.filter(c => ['sent', 'partial'].includes(c.status)).length}</strong><span>Campaigns submitted</span></div></div></header>
 <nav className="mk-tabs" aria-label="Campaign workspace">{[['templates', 'Templates'], ['compose', 'Composer'], ['history', 'Campaigns']].map(([key, label]) => <button key={key} aria-pressed={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
 {tab === 'templates' && <section><div className="mk-section-title"><div><p className="mk-overline">THE TEMPLATE LIBRARY</p><h3>{updates ? 'A clear message for every situation.' : 'Choose your next campaign.'}</h3></div><span>Choose a design. Make it yours. Preview before you send.</span></div><div className="mk-library-tools"><input type="search" aria-label="Search templates" placeholder="Search templates…" value={query} onChange={e => setQuery(e.target.value)} /><div className="mk-filters" aria-label="Template categories">{['All', ...new Set(templates.map(t => t.group))].map(g => <button key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}</div></div><div className="mk-template-grid">{visible.map(t => <button className={'mk-template mk-designed-card mk-template-' + t.layout} onClick={() => apply(t)} key={t.id}><div className="mk-design-window" aria-hidden="true"><iframe tabIndex={-1} sandbox="" title={t.name + ' design thumbnail'} srcDoc={emailHtml({
              ...base,
              ...t
            }, {
              assetBaseUrl: location.origin
            })} /></div><div><small>{t.group} / {t.layout}</small><strong>{t.name}</strong><p>{t.headline}</p><i>Make it yours <span>↗</span></i></div></button>)}</div>{!visible.length && <div className="ra-empty">No templates match. Try another category or search.</div>}</section>}
 {tab === 'compose' && <><div className="mk-composition-bar"><div><span className="mk-state">{draftId ? 'Saved draft' : 'New draft'}</span><strong>{d.name || 'Untitled campaign'}</strong><small>{lastSaved ? 'Saved ' + lastSaved : 'Your changes are saved when you choose Save draft.'}</small></div><button onClick={() => setTab('templates')}>Browse templates ↗</button></div><div className="mk-compose-grid"><section className="ra-panel ra-composer mk-editor"><fieldset disabled={Boolean(busy)}><legend><span>01</span> Inbox details</legend>{field('name', 'Internal campaign name')}{field('subject', 'Email subject', {
              maxLength: 300
            })}{field('preheader', 'Inbox preheader')}<p className="mk-field-note">The subject and preheader are what people see before opening your email.</p></fieldset><fieldset disabled={Boolean(busy)}><legend><span>02</span> Message & design</legend><div className="ra-form-two">{field('kicker', 'Editorial kicker')}<label>Layout<select value={d.layout} onChange={e => setD(x => ({
                  ...x,
                  layout: e.target.value
                }))}>{[['split', 'Split campaign'], ['poster', 'Launch poster'], ['editorial', 'Editorial'], ['dark', 'Dark campaign'], ['gallery', 'Lookbook'], ['offer', 'Offer'], ['letter', 'Personal letter'], ['notice', 'Service notice']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></div>{d.layout === 'notice' && field('statusLabel', 'Notice status')}{field('headline', 'Headline')}{field('body', updates ? 'Announcement message' : 'Campaign message', {
              area: true,
              rows: 6
            })}{d.layout === 'offer' && <div className="ra-form-two">{field('offer', 'Offer display')}{field('code', 'Promotion code')}</div>}{['letter', 'minimal'].includes(d.layout) && field('signature', 'Sign-off')}{field('detailLabel', 'Detail heading')}{field('detail', 'Details / dates / next steps', {
              area: true,
              rows: 3
            })}{updates && <p className="mk-field-note">Templates are starting points. Confirm the facts, affected services and next update time before sending.</p>}</fieldset><fieldset disabled={Boolean(busy)}><legend><span>03</span> Destination & artwork</legend><div className="ra-form-two">{field('ctaLabel', 'Button label')}{field('ctaUrl', 'Destination URL', {
                type: 'url'
              })}</div>{field('imageUrl', 'Campaign image URL')}{field('imageAlt', 'Image description')}{d.layout === 'gallery' && <>{field('secondaryImageUrl', 'Second image URL')}<MediaUpload label="Upload second email image" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onUploaded={asset=>setD(x=>({...x,secondaryImageUrl:asset.url}))}/></>}{field('videoUrl','Campaign video link')}<MediaUpload label="Upload campaign video" accept="video/mp4,video/webm" disabled={Boolean(busy)} onUploaded={asset=>setD(x=>({...x,videoUrl:asset.url}))}/><p className="mk-field-note">Emails include a link to watch the video. Upload a poster using the email artwork control.</p><MediaUpload label="Upload email artwork" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onUploaded={asset=>setD(x=>({...x,imageUrl:asset.url}))}/><div className="mk-image-strip">{Array.from({
                length: 9
              }, (_, i) => '/assets/campaigns/campaign-' + String(i + 1).padStart(2, '0') + '.jpeg').map(x => <button type="button" className={d.imageUrl === x ? 'active' : ''} onClick={() => setD(v => ({
                ...v,
                imageUrl: x
              }))} key={x} aria-label={'Select artwork ' + x.split('/').pop()}><img src={x} alt="" loading="lazy" /></button>)}</div><button className="mk-text-button" onClick={() => setD(v => ({
              ...v,
              imageUrl: '',
              secondaryImageUrl: ''
            }))}>Remove artwork</button></fieldset><div className="mk-send-panel"><p className="mk-overline">04 / REVIEW & SEND</p><strong>{subs.length} selected subscribers</strong>{updates && audienceField('kind', 'Message audience', [['subscribers', 'Opted-in subscribers'], ['order_customers', 'Affected order customers']])}<div className="ra-form-two">{audienceField('source', 'Signup source', [['', 'All sources'], ['footer', 'Footer'], ['storefront', 'Storefront'], ['checkout', 'Checkout']])}{audienceField('market', 'Subscriber market', [['', 'All markets'], ['za', 'South Africa'], ['us', 'United States'], ['ng', 'Nigeria'], ['bw', 'Botswana']])}{audienceField('purchase', 'Purchase history', [['all', 'Everyone'], ['buyers', 'Paid customers'], ['nonbuyers', 'No paid orders']])}{updates && audienceField('orderStatus', 'Affected order status', [['', 'All subscribers'], ['processing', 'Processing'], ['packed', 'Packed'], ['shipped', 'Shipped']])}</div>{field('scheduleLocal', 'Send time (SAST, optional)', {
              type: 'datetime-local'
            })}<p className="mk-field-note">Leave blank to queue now. Scheduling uses South African time (UTC+2). Consent is checked again at send time. Market filters exclude records with an unknown market.</p><p>Marketing excludes pending, unsubscribed and suppressed addresses. Order notices target customers with the selected order status; use this only for factual service information concerning their orders.</p><label>Preview recipient<input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder={auth.currentUser?.email || 'you@example.com'} /></label><button className="mk-test-button" onClick={test} disabled={Boolean(busy)}>{busy === 'test' ? 'Sending preview…' : 'Send test email'}</button><div className="ra-admin-actions"><button className="danger" onClick={save} disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button><button onClick={send} disabled={Boolean(busy) || !subs.length}>{busy === 'send' ? 'Sending…' : `Send to ${subs.length}`}</button></div></div></section><section className="ra-panel ra-preview mk-preview"><div className="ra-panel-head"><div><p className="mk-overline">EMAIL PREVIEW</p><h2>{d.subject || 'Email preview'}</h2></div><div className="ra-preview-toggle"><button aria-pressed={!mobile} className={!mobile ? 'active' : ''} onClick={() => setMobile(false)}>Desktop</button><button aria-pressed={mobile} className={mobile ? 'active' : ''} onClick={() => setMobile(true)}>Mobile</button></div></div><div className="mk-inbox-preview"><strong>{d.subject || 'Your subject line'}</strong><span>{d.preheader || 'Your inbox preview text'}</span></div><iframe className={mobile ? 'mobile' : ''} sandbox="" title="Campaign preview" srcDoc={previewHtml} /><p className="mk-field-note">Images must be publicly accessible. Email apps may render small differences; send a test before the full campaign.</p></section></div></>}
 {tab === 'history' && <section className="ra-panel mk-results"><div className="ra-panel-head"><div><p className="mk-overline">CAMPAIGN RECORDS</p><h2>From draft to send.</h2></div><span>{campaigns.length} records</span></div><p>Accepted means the email provider received the message. Delivery, bounce and complaint totals update from signed provider webhooks after deployment. Recipient-server acceptance does not confirm inbox placement or that someone read the email. Check Spam and Promotions. Test emails send directly; campaigns wait for the background queue. Opens and clicks are not tracked.</p>{campaigns.length ? <div className="mk-result-list">{campaigns.map(c => <article key={c.id}><div><span className={'mk-state mk-state-' + c.status}>{(c.status === 'sent' ? 'submitted to provider' : c.status || 'draft').replaceAll('_', ' ')}</span><h3>{c.name || 'Untitled campaign'}</h3><p>{c.subject || 'No subject'}</p><small>{date(c.sentAt || c.createdAt)}</small>{c.scheduledAt && <p>Scheduled: {new Intl.DateTimeFormat('en-ZA', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Africa/Johannesburg'
              }).format(new Date(c.scheduledAt))} SAST</p>}{c.lastError && <p className="mk-send-error">{c.lastError}</p>}{c.status === 'delivery_unknown' && <p>Check provider logs before starting another send. Some messages may have been accepted.</p>}</div><div className="mk-result-counts"><div><strong>{c.recipientCount || 0}</strong><span>Audience</span></div><div><strong>{c.acceptedCount ?? c.deliveredCount ?? 0}</strong><span>Accepted</span></div><div><strong>{c.failedCount || 0}</strong><span>Failed submissions</span></div><div><strong>{c.deliveredCount || 0}</strong><span>Recipient server accepted</span></div><div><strong>{c.bouncedCount || 0}</strong><span>Bounced</span></div><div><strong>{c.complainedCount || 0}</strong><span>Complaints</span></div><div><strong>{c.skippedCount || 0}</strong><span>Consent exclusions</span></div><div><strong>{c.delayedCount || 0}</strong><span>Provider delayed</span></div><div><strong>{c.recipientCount ? Math.max(0,c.recipientCount-(c.acceptedCount||0)-(c.failedCount||0)-(c.skippedCount||0)) : 0}</strong><span>Awaiting submission</span></div></div><div className="mk-record-actions">{['queued', 'scheduled', 'sending', 'delivery_unknown'].includes(c.status) && <button disabled={Boolean(busy)} onClick={() => cancel(c)}>Cancel remaining send</button>}{c.status === 'delivery_unknown' && <button onClick={() => setReconciling(c)}>Reconcile batch</button>}<button onClick={() => loadCampaign(c)}>{c.status === 'draft' ? 'Edit draft' : 'Use as new draft'} ↗</button></div></article>)}</div> : <div className="ra-empty">No {updates ? 'updates' : 'campaigns'} yet. Start with a template and save your first draft.</div>}</section>}
 {reconciling && <form className="ra-panel mk-reconciliation" onSubmit={reconcile}><h3>Reconcile {reconciling.name}</h3><p>Use provider logs to establish every recipient outcome. Never guess. Partial or uncertain outcomes must remain blocked.</p><label>Batch index (shown in the error)<input name="batchIndex" type="number" min="0" required /></label><label>Provider result<select name="decision"><option value="accepted">Every submitted message accepted</option><option value="not_accepted">None accepted — resume this batch</option></select></label><label>Provider email IDs, in recipient order<textarea name="providerIds" rows="3" /></label><label>Evidence / provider log reference<textarea name="note" required rows="3" maxLength="1000" /></label><div className="ra-admin-actions"><button type="button" onClick={() => setReconciling(null)}>Close reconciliation</button><button disabled={Boolean(busy)}>Save reconciliation</button></div></form>} </div>;
}
