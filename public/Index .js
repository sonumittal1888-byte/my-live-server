<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamFlow - Premium Live</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .card { background: #1e293b; padding: 30px; border-radius: 20px; width: 320px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
        .icon { font-size: 50px; margin-bottom: 10px; background: linear-gradient(135deg, #38bdf8, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        h2 { margin: 0; color: #f8fafc; font-size: 24px; }
        p { font-size: 13px; color: #94a3b8; margin-bottom: 25px; }
        .tabs { display: flex; background: #0f172a; border-radius: 10px; padding: 5px; margin-bottom: 20px; }
        .tab { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; cursor: pointer; border: none; color: #94a3b8; background: transparent; }
        .tab.active { background: #1e293b; color: white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
        input { width: 100%; padding: 12px; margin: 8px 0; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; outline: none; }
        input:focus { border-color: #38bdf8; }
        .btn-main { width: 100%; padding: 14px; border-radius: 10px; border: none; background: linear-gradient(90deg, #0ea5e9, #2563eb); color: white; font-weight: bold; cursor: pointer; margin-top: 15px; font-size: 15px; }
        .footer { font-size: 12px; margin-top: 20px; color: #64748b; }
        .footer a { color: #38bdf8; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">📹</div>
        <h2>StreamFlow</h2>
        <p>Your premium live streaming platform</p>
        
        <div class="tabs">
            <button class="tab active">Sign In</button>
            <button class="tab">Sign Up</button>
        </div>

        <input type="email" placeholder="Email Address">
        <input type="password" placeholder="Password">
        
        <button class="btn-main">Sign In</button>
        
        <div class="footer">
            Don't have an account? <a href="#">Sign up</a>
        </div>
    </div>
</body>
</html>

