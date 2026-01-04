# IRIS Quick Start Guide

Get IRIS Noise Eraser running in 5 minutes!

---

## 🚀 Installation (5 minutes)

### Step 1: Start the Backend (2 min)

```bash
# Clone or navigate to the project
cd iris/backend

# Create virtual environment (first time only)
python -m venv venv

# Activate it
source venv/bin/activate  # Mac/Linux
# OR
venv\Scripts\activate     # Windows

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
python src/server.py
# Should see: "Running on http://127.0.0.1:8080"
```

**Keep this terminal open!**

### Step 2: Load Extension (2 min)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle **"Developer mode"** (top right)
4. Click **"Load unpacked"**
5. Select the `iris/extension` folder
6. You should see "IRIS" in your extensions list

### Step 3: Test It (1 min)

1. Go to any GitHub code file, example:
   `https://github.com/facebook/react/blob/main/packages/react/src/React.js`

2. Look for the **"Focus Mode"** button (bottom right)

3. Click it → Watch non-essential code dim!

4. Click the **⚙️ icon** to open settings

---

## 🎨 Using the Settings Panel

### Open Settings
- Click the **⚙️ icon** on the Focus Mode button
- OR **right-click** the Focus Mode button

### Adjust Noise Opacity
- Move the slider left (less dim) or right (more dim)
- Range: 10% - 50%
- Changes apply immediately

### Toggle Noise Types
Click toggles to enable/disable dimming for:
- ⚠️ **Error Handling** (try-catch, error checks)
- 📝 **Logging** (console.log, print)
- 📦 **Imports** (import statements)
- 🛡️ **Guard Clauses** (null checks, early returns)
- 🔧 **Boilerplate** (getters, setters)

### View Your Stats
- **Total Uses** - How many times you've activated Focus Mode
- **Avg Noise** - Average percentage of noise across all files
- **Language Breakdown** - Which languages you analyze most

---

## ⌨️ Keyboard Shortcut

Press **`Alt + P`** to toggle Focus Mode on/off

---

## 🎯 What Gets Dimmed?

IRIS identifies and dims these patterns:

| Pattern | Example |
|---------|---------|
| Error Handling | `try { ... } catch (e) { ... }` |
| Logging | `console.log("debug")` |
| Imports | `import React from 'react'` |
| Guard Clauses | `if (!user) return null` |
| Null Checks | `if (data === undefined)` |

**Core logic stays visible!**

---

## 🔧 Troubleshooting

### Button doesn't appear
- ✅ Is the backend running? (Check terminal)
- ✅ Are you on a GitHub code page? (Not repo home page)
- ✅ Try refreshing the page

### "Analysis failed" error
- ✅ Check backend is running on port 8080
- ✅ Look at backend terminal for error messages
- ✅ Try a different file

### Settings don't save
- ✅ Check browser localStorage is enabled
- ✅ Try in incognito mode to test
- ✅ Clear browser cache and reload extension

### Dimming looks weird
- ✅ Try adjusting opacity slider
- ✅ Some GitHub themes may interfere
- ✅ Refresh the page after changing settings

---

## 🧪 Test Files to Try

Good files to test IRIS on:

**JavaScript/React:**
- https://github.com/facebook/react/blob/main/packages/react/src/React.js

**Python:**
- https://github.com/tiangolo/fastapi/blob/master/fastapi/applications.py

**Go:**
- https://github.com/kubernetes/kubernetes/blob/master/cmd/kubelet/kubelet.go

---

## 📚 Advanced Usage

### Custom Noise Profiles

Open settings and:
1. Disable all toggles
2. Enable only the types you care about
3. Settings save automatically

### Analyzing PRs

1. Open a PR on GitHub
2. Click "Files changed" tab
3. Navigate to any file
4. Click Focus Mode on each file you review

### Best Practices

- **Start with default settings** (20% opacity, all types enabled)
- **Hover over dimmed lines** to see them more clearly
- **Use keyboard shortcut** (`Alt + P`) for quick toggling
- **Check your stats** regularly to see your patterns

---

## 🎓 Tips & Tricks

1. **Multi-file review:** Settings persist across files in the same session
2. **Language-specific:** IRIS detects language automatically from file extension
3. **Large files:** Files with 1000+ lines are processed in chunks (no lag)
4. **Cache:** Backend caches patterns for speed (40% faster on large files)

---

## 🐛 Report Issues

Found a bug? Have a suggestion?
- Open an issue on GitHub
- Include:
  - Browser version (Chrome, Edge, etc.)
  - File URL where issue occurred
  - Screenshot if UI-related

---

## 🚀 What's Next?

**Coming Soon: Semantic Intent Overlay (Phase 6)**
- LLM-powered intent explanations
- Understand WHY code exists, not just WHAT it does
- Hover over functions to see AI-generated purpose

Stay tuned!

---

## 📖 Learn More

- **Full Documentation:** See `README.md`
- **Architecture:** See `.github/copilot-instructions.md`
- **Phase 5 Details:** See `PHASE5_COMPLETION.md`

---

**Happy Reviewing! 🎉**

*Reduce the noise. Amplify the signal.*
