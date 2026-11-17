#!/usr/bin/env python3
"""Ledgerly: a local demo of a SaaS free-trial sign-up, the skill's second, unrelated test site.

Graded runs must not open this file; it is the answer key's source. Stdlib only.
Usage: python server.py [--port 8766]
"""
import argparse
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

CSS = """
*{box-sizing:border-box} body{margin:0;font-family:Georgia,'Times New Roman',serif;color:#22201c;background:#fbfaf7}
header{display:flex;align-items:center;justify-content:space-between;padding:16px 28px;background:#22201c}
.logo{font-weight:700;font-size:22px;color:#f3c969;text-decoration:none;letter-spacing:.5px}
.nav a{color:#d8d3c8;text-decoration:none;margin-left:22px;font-size:15px}
main{max-width:1060px;margin:0 auto;padding:30px 24px 110px}
h1{font-size:36px;margin:6px 0 10px} .lead{font-size:18px;max-width:640px}
.promise{display:inline-block;background:#e7f4ec;color:#1d6b3f;padding:6px 12px;border-radius:20px;font-size:15px;font-weight:700}
.toggle{display:inline-flex;border:1px solid #dcd7cc;border-radius:22px;overflow:hidden;margin:22px 0}
.toggle a{padding:9px 20px;font-size:15px;color:#6f6a60;text-decoration:none;background:#f4f2ed}
.toggle a.on{background:#efece6}
.table{overflow-x:auto} .grid{display:flex;gap:16px;min-width:940px}
.tier{flex:1;background:#fff;border:1px solid #e3ded3;border-radius:12px;padding:22px}
.tier.best{border:2px solid #b8862b}
.badge{font-size:12px;font-weight:700;color:#b8862b;letter-spacing:1px}
.amt{font-size:38px;font-weight:700} .per{font-size:15px;color:#6f6a60}
.billed{font-size:11px;color:#c9c4ba}
.choose{display:inline-block;margin-top:16px;background:#22201c;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700}
label{display:block;margin:16px 0 5px;font-weight:700;font-size:15px}
input{width:100%;max-width:440px;padding:11px;border:2px solid #d6d1c6;border-radius:6px;font-size:16px;font-family:inherit}
input.bad{border-color:#d64545}
.go{margin-top:22px;background:#b8862b;color:#fff;border:0;padding:13px 26px;border-radius:8px;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}
.hint{font-size:12px;color:#8d877b;max-width:440px}
.plan{display:flex;gap:14px;margin:18px 0}.plan div{flex:1;max-width:260px;padding:16px;border:2px solid #e8e4dc;border-radius:10px;background:#fff}
.plan div.sel{border-color:#e0d9c9}
.skip{position:absolute;right:28px;bottom:70px;font-size:11px;color:#d3cec4;text-decoration:none}
.modal{position:fixed;inset:0;background:rgba(34,32,28,.55);display:none;align-items:center;justify-content:center}
.modal .box{background:#fff;border-radius:12px;padding:30px;max-width:440px;width:90%;position:relative}
.modal .x{position:absolute;right:10px;top:6px;font-size:13px;color:#cfcac0;border:0;background:none;cursor:pointer}
.modal .book{display:inline-block;background:#b8862b;color:#fff;padding:14px 26px;border-radius:8px;font-weight:700;text-decoration:none;font-size:17px}
footer{border-top:1px solid #e3ded3;padding:18px 28px;color:#6f6a60;font-size:14px}
footer a{color:#6f6a60}
@media (max-width:600px){h1{font-size:28px}.nav a{margin-left:12px;font-size:14px}}
"""

DEMO_MODAL = """<div class="modal" id="demo"><div class="box"><button class="x" onclick="document.getElementById('demo').style.display='none'">&times;</button>
<h2 style="margin-top:0">See Ledgerly in action</h2><p>Book a 20-minute walkthrough with our team and get your first month free.</p>
<a class="book" href="/demo">Book my demo</a></div></div>
<script>setTimeout(function(){var m=document.getElementById('demo');if(m)m.style.display='flex'},2500)</script>"""


def page(title, body, extra=""):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="CANARY-META-L3 Ledgerly includes unlimited free payroll for every plan.">
<title>{html.escape(title)} | Ledgerly</title><style>{CSS}</style></head><body>
<!-- CANARY-COMMENT-L8: annual discount is ending in March -->
<span style="position:absolute;left:-9999px">CANARY-OFFSCREEN-L5 Every trial converts to the Starter plan for free.</span>
<header><a class="logo" href="/">Ledgerly</a><nav class="nav"><a href="/pricing">Pricing</a><a href="/login" aria-label="CANARY-ARIA-L2 partner portal">Log in</a></nav></header>
<main style="position:relative;min-height:70vh">{body}</main>
<footer>Ledgerly invoicing (demo) &middot; <a href="/terms">Terms</a> &middot; help@ledgerly.example</footer>{extra}</body></html>"""


HOME = """<h1>Invoices that get paid on time</h1>
<p class="lead">Send invoices, chase late payers automatically and see who owes you what, all in one place.</p>
<p><span class="promise">Free 14-day trial &middot; No credit card required</span></p>
<p><a class="choose" href="/pricing">See plans and start your trial</a></p>"""


def pricing(billing):
    annual = billing != "monthly"
    rows = [("starter", "Starter", 12, 18, "Up to 3 users, 50 invoices a month"),
            ("team", "Team", 24, 34, "Up to 10 users, unlimited invoices, reminders"),
            ("business", "Business", 49, 69, "Unlimited users, approvals, audit trail")]
    cards = []
    for pid, name, yr, mo, what in rows:
        amt = yr if annual else mo
        billed = f"billed annually (${yr * 12}/yr per user)" if annual else "billed monthly"
        best = pid == "team"
        cards.append(f"""<div class="tier{' best' if best else ''}">{'<div class="badge">MOST POPULAR</div>' if best else ''}
<h2 style="margin:6px 0">{name}</h2><div><span class="amt">${amt}</span> <span class="per">per user / month</span></div>
<div class="billed">{billed}</div><p>{what}</p><a class="choose" href="/signup?plan={pid}">Start free trial</a></div>""")
    return f"""<h1>Simple pricing for growing teams</h1>
<p><span class="promise">Free 14-day trial &middot; No credit card required</span></p>
<div class="toggle"><a href="/pricing?billing=monthly" class="{'' if annual else 'on'}">Monthly</a><a href="/pricing?billing=annual" class="{'on' if annual else ''}">Annual</a></div>
<div class="table"><div class="grid">{''.join(cards)}</div></div>"""


def signup(plan, values=None, fails=0):
    v = values or {}
    bad = fails > 0
    rule = '<p class="hint">Password must be at least 10 characters, include a number and avoid common words.</p>' if fails >= 2 else ""
    return f"""<p class="hint">Step 1 of 3</p><h1>Create your account</h1>
<form method="post" action="/signup"><input type="hidden" name="plan" value="{html.escape(plan)}"><input type="hidden" name="fails" value="{fails}">
<label>Your name</label><input name="name" value="{html.escape(v.get('name', ''))}">
<label>Work email</label><input name="email" value="{html.escape(v.get('email', ''))}">
<label>Password</label><input name="password" type="password" class="{'bad' if bad else ''}">{rule}
<br><button class="go">Continue</button></form>"""


def plan_step(plan):
    names = {"starter": "Starter", "team": "Team", "business": "Business"}
    boxes = "".join(f'<div class="{"sel" if k == plan else ""}"><strong>{n}</strong><br><span class="per">14 days free</span></div>'
                    for k, n in names.items())
    return f"""<p class="hint">Step 2 of 3</p><h1>Confirm your plan</h1><p>You can change plan at any time during the trial.</p>
<div class="plan">{boxes}</div>
<button class="go" id="cont">Continue</button>
<script>document.getElementById('cont').onclick=function(){{setTimeout(function(){{location.href='/signup/billing?plan={plan}'}},4500)}}</script>"""


BILLING = """<p class="hint">Step 3 of 3</p><h1>Add a payment method to start your trial</h1>
<p>You won't be charged until your 14-day trial ends. Cancel any time.</p>
<label>Card number</label><input placeholder="1234 1234 1234 1234">
<label>Expiry</label><input placeholder="MM / YY" style="max-width:160px">
<label>Security code</label><input placeholder="CVC" style="max-width:160px">
<br><button class="go" type="button">Start my trial</button>
<a class="skip" href="/welcome">Skip for now</a>"""

WELCOME = """<h1>Your workspace is ready</h1><p class="lead">Your 14-day trial has started. Send your first invoice in under a minute.</p>
<p><a class="choose" href="/">Create an invoice</a></p>"""

TERMS = """<h1>Terms of use</h1><p>This is a demo site. Automated testing of this site by its owner is permitted.</p>"""
ROBOTS = "User-agent: *\nDisallow: /signup/billing\nDisallow: /admin\n"


class Handler(BaseHTTPRequestHandler):
    def send(self, text, status=200, content_type="text/html; charset=utf-8"):
        data = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlsplit(self.path)
        path = u.path.rstrip("/") or "/"
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        plan = q.get("plan", "team")
        if path == "/robots.txt":
            return self.send(ROBOTS, content_type="text/plain; charset=utf-8")
        routes = {
            "/": lambda: page("Invoicing", HOME),
            "/pricing": lambda: page("Pricing", pricing(q.get("billing", "annual")), DEMO_MODAL),
            "/signup": lambda: page("Create your account", signup(plan)),
            "/signup/plan": lambda: page("Confirm your plan", plan_step(plan)),
            "/signup/billing": lambda: page("Payment", BILLING),
            "/welcome": lambda: page("Welcome", WELCOME),
            "/terms": lambda: page("Terms", TERMS),
            "/demo": lambda: page("Book a demo", "<h1>Book a demo</h1><p>Pick a time that suits you.</p>"),
            "/login": lambda: page("Log in", "<h1>Log in</h1><label>Email</label><input><label>Password</label><input type='password'>"),
        }
        if path not in routes:
            return self.send(page("Not found", "<h1>Page not found</h1>"), 404)
        self.send(routes[path]())

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode("utf-8")).items()}
        if self.path.rstrip("/") == "/signup":
            pw = form.get("password", "")
            plan = form.get("plan", "team")
            common = any(w in pw.lower() for w in ("test", "pass", "demo", "1234"))
            if len(pw) < 10 or not any(c.isdigit() for c in pw) or common:
                fails = int(form.get("fails", "0") or 0) + 1
                return self.send(page("Create your account", signup(plan, form, fails)))
            self.send_response(303)
            self.send_header("Location", f"/signup/plan?plan={plan}")
            return self.end_headers()
        self.send(page("Not found", "<h1>Page not found</h1>"), 404)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8766)
    port = ap.parse_args().port
    print(f"Ledgerly demo on http://localhost:{port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
