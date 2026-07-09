// EsportsBet support widget — drop-in chat bubble for any website.
//
// Usage: add this to your site, before </body>:
//   <script src="https://YOUR-BACKEND-URL/widget/widget.js"
//           data-api="https://YOUR-BACKEND-URL"></script>
//
// data-api should be the backend BASE url (the widget appends /api/chat etc).
// Works on WordPress, React, plain HTML. No dependencies. Streams responses.

(function () {
  var script = document.currentScript;
  var BASE =
    (script && script.getAttribute("data-api")) || window.location.origin;
  BASE = BASE.replace(/\/+$/, "").replace(/\/api\/chat$/, ""); // tolerate old value
  var ACCENT = (script && script.getAttribute("data-accent")) || "#3ddc97";
  var TITLE = (script && script.getAttribute("data-title")) || "EsportsBet Support";

  var history = [];
  var open = false;
  var lastQuestion = "";

  var css =
    ".ebsb-btn{position:fixed;bottom:22px;right:22px;width:58px;height:58px;border-radius:50%;background:" + ACCENT + ";border:none;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.28);z-index:2147483000;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".ebsb-btn:hover{transform:scale(1.06)}.ebsb-btn svg{width:26px;height:26px;fill:#06210f}" +
    ".ebsb-panel{position:fixed;bottom:92px;right:22px;width:370px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 120px);background:#0f141c;border:1px solid #26303f;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,sans-serif}" +
    ".ebsb-panel.open{display:flex}" +
    ".ebsb-head{padding:14px 16px;background:#141922;border-bottom:1px solid #26303f;display:flex;align-items:center;gap:9px;color:#e6ecf5;font-size:14px;font-weight:600}" +
    ".ebsb-head .d{width:8px;height:8px;border-radius:50%;background:" + ACCENT + ";box-shadow:0 0 8px " + ACCENT + "}" +
    ".ebsb-head .x{margin-left:auto;background:none;border:none;color:#8896aa;font-size:20px;cursor:pointer;line-height:1}" +
    ".ebsb-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;background:#0b0e13}" +
    ".ebsb-m{max-width:82%;padding:10px 13px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}" +
    ".ebsb-m.u{align-self:flex-end;background:" + ACCENT + ";color:#06210f;border-bottom-right-radius:3px}" +
    ".ebsb-m.b{align-self:flex-start;background:#1b2230;color:#e6ecf5;border:1px solid #26303f;border-bottom-left-radius:3px}" +
    ".ebsb-m.esc{border-color:#ffb454}" +
    ".ebsb-fb{align-self:flex-start;display:flex;gap:6px;margin:-4px 0 2px 2px}" +
    ".ebsb-fb button{background:none;border:1px solid #26303f;color:#8896aa;border-radius:6px;cursor:pointer;font-size:12px;padding:2px 7px}" +
    ".ebsb-fb button:hover{color:#e6ecf5;border-color:" + ACCENT + "}" +
    ".ebsb-fb.done{color:#5a6678;font-size:11px;padding:2px}" +
    ".ebsb-in{padding:12px;border-top:1px solid #26303f;background:#141922;display:flex;gap:8px}" +
    ".ebsb-in input{flex:1;background:#0b0e13;border:1px solid #26303f;color:#e6ecf5;padding:10px 12px;border-radius:9px;font-size:13.5px;outline:none}" +
    ".ebsb-in input:focus{border-color:" + ACCENT + "}" +
    ".ebsb-in button{background:" + ACCENT + ";color:#06210f;border:none;padding:0 15px;border-radius:9px;font-weight:600;cursor:pointer;font-size:13.5px}" +
    ".ebsb-foot{font-size:10px;color:#5a6678;text-align:center;padding:6px;background:#141922}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.className = "ebsb-btn";
  btn.setAttribute("aria-label", "Open support chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.7 1.32 5.12 3.4 6.78L4.5 22l4.63-2.3c.9.2 1.87.3 2.87.3 5.52 0 10-4.03 10-9S17.52 2 12 2z"/></svg>';

  var panel = document.createElement("div");
  panel.className = "ebsb-panel";
  panel.innerHTML =
    '<div class="ebsb-head"><span class="d"></span>' + TITLE + '<button class="x" aria-label="Close">&times;</button></div>' +
    '<div class="ebsb-msgs" id="ebsb-msgs"></div>' +
    '<div class="ebsb-in"><input id="ebsb-inp" placeholder="Type your question…" autocomplete="off"><button id="ebsb-send">Send</button></div>' +
    '<div class="ebsb-foot">Automated assistant · a human agent is available if needed</div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgs = panel.querySelector("#ebsb-msgs");
  var inp = panel.querySelector("#ebsb-inp");

  function toggle() {
    open = !open;
    panel.classList.toggle("open", open);
    if (open) {
      if (!msgs.children.length)
        addMsg("Hi! I'm the EsportsBet support assistant. Ask me about withdrawals, KYC, bonuses, betting, or your account.", "b");
      inp.focus();
    }
  }
  btn.onclick = toggle;
  panel.querySelector(".x").onclick = toggle;

  function addMsg(text, cls) {
    var d = document.createElement("div");
    d.className = "ebsb-m " + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function addFeedback() {
    var fb = document.createElement("div");
    fb.className = "ebsb-fb";
    fb.innerHTML = '<button data-v="up">👍</button><button data-v="down">👎</button>';
    fb.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () {
        fetch(BASE + "/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: b.getAttribute("data-v"), question: lastQuestion }),
        }).catch(function () {});
        fb.className = "ebsb-fb done";
        fb.textContent = "Thanks for the feedback.";
      };
    });
    msgs.appendChild(fb);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function send() {
    var q = inp.value.trim();
    if (!q) return;
    inp.value = "";
    lastQuestion = q;
    addMsg(q, "u");
    history.push({ role: "user", content: q });
    var bubble = addMsg("…", "b");
    var acc = "";

    fetch(BASE + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q, history: history.slice(0, -1) }),
    })
      .then(function (r) {
        // Non-streaming path (safety/escalation returns plain JSON)
        var ct = r.headers.get("content-type") || "";
        if (ct.indexOf("application/json") !== -1) {
          return r.json().then(function (data) {
            bubble.textContent = data.answer || "Sorry, please try again.";
            if (data.escalate) bubble.className = "ebsb-m b esc";
            history.push({ role: "assistant", content: bubble.textContent });
            addFeedback();
          });
        }
        // Streaming path (Server-Sent Events)
        var reader = r.body.getReader();
        var dec = new TextDecoder();
        bubble.textContent = "";
        function pump() {
          return reader.read().then(function (res) {
            if (res.done) {
              history.push({ role: "assistant", content: acc });
              addFeedback();
              return;
            }
            dec.decode(res.value, { stream: true }).split("\n\n").forEach(function (chunk) {
              var line = chunk.trim();
              if (line.indexOf("data: ") !== 0) return;
              try {
                var ev = JSON.parse(line.slice(6));
                if (ev.delta) {
                  acc += ev.delta;
                  bubble.textContent = acc;
                  msgs.scrollTop = msgs.scrollHeight;
                }
              } catch (e) {}
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        bubble.textContent = "I'm having trouble connecting right now. Please try again in a moment.";
      });
  }

  panel.querySelector("#ebsb-send").onclick = send;
  inp.addEventListener("keydown", function (e) {
    if (e.key === "Enter") send();
  });
})();
