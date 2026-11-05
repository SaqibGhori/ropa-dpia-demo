// ROPA + DPIA screening drafter: processing-activity form -> GDPR Art. 30 record + Art. 35 screening (EDPB WP248 criteria), via Groq.
const SYSTEM = `You are a senior EU data protection consultant. From the processing activity described by the user, draft:
1) a ROPA entry per GDPR Article 30(1) for a controller;
2) a DPIA screening per Article 35(1) and 35(3), using the 9 EDPB/WP29 WP248 rev.01 criteria
   (evaluation/scoring, automated decisions with legal effect, systematic monitoring, special category or highly personal data,
    large scale, matching/combining datasets, vulnerable data subjects, innovative technology, preventing exercise of a right/service).
   Rule of thumb from WP248: meeting 2 or more criteria usually means a DPIA is required.
Only cite these GDPR articles, and only where they truly apply: 5, 6(1)(a)-(f), 9(2)(a)-(j), 13, 14, 15-22, 25, 28, 30, 32, 33, 34, 35, 36, 37, 44, 45, 46, 49.
Use the official names in "basis": 6(1)(a) Consent, 6(1)(b) Contract, 6(1)(c) Legal obligation, 6(1)(d) Vital interests, 6(1)(e) Public task, 6(1)(f) Legitimate interests. Only cite 6(1)(c) when a specific legal duty exists (e.g. keeping medical records required by law) and say which duty.
Lawful basis rules: for a core service, prefer 6(1)(b) contract or 6(1)(c)/(e) over consent; use 6(1)(a) consent only for optional extras (e.g. marketing), since consent must be freely given (Art. 7, imbalance of power).
For health data processed by or for healthcare providers use 9(2)(h) (with 9(3) professional secrecy), not explicit consent, unless the user says consent is the basis.
Transfers: Standard Contractual Clauses = Art. 46(2)(c); adequacy = Art. 45; Art. 49 is only for occasional derogations, never pair it with SCCs.
A recommendation or suggestion that a human acts on is NOT an "automated decision with legal or similarly significant effect" (Art. 22); mark that criterion met only for solely automated decisions.
security_measures are RECOMMENDED measures unless the user said they exist: start each with "Recommended:".
Never invent facts the user did not give; when something is missing, write "To confirm" and add it to open_questions.
Return JSON exactly:
{"ropa":{"activity":str,"controller":str,"purposes":[str],"lawful_basis":[{"basis":str,"article":str,"why":str}],
 "special_category":{"applies":bool,"condition":str|null,"article":str|null},
 "data_subjects":[str],"data_categories":[str],"recipients":[str],"processors":[str],
 "international_transfers":{"applies":bool,"destination":str|null,"safeguard":str|null,"article":str|null},
 "retention":str,"security_measures":[str]},
 "dpia":{"criteria":[{"criterion":str,"met":bool,"reason":str}],"criteria_met":int,"dpia_required":bool,
 "conclusion":str,"key_risks":[{"risk":str,"likelihood":"low"|"medium"|"high","severity":"low"|"medium"|"high","mitigation":str,"article":str}]},
 "open_questions":[str]}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const f = req.body || {};
    const user = Object.entries(f).filter(([, v]) => v).map(([k, v]) => `${k}: ${String(v).slice(0, 1500)}`).join('\n');
    if (user.length < 40) return res.status(400).json({ error: 'Describe the processing activity first.' });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-120b', temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }] }),
    });
    if (!r.ok) return res.status(502).json({ error: 'model error', detail: (await r.text()).slice(0, 200) });
    res.status(200).json(JSON.parse((await r.json()).choices[0].message.content));
  } catch (e) {
    res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
};
