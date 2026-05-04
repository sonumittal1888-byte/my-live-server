<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StreamFlow - Premium Portal</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        body { 
            background: #0f172a;
            background: radial-gradient(circle at 50% -20%, #312e81, #0f172a);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            overflow: hidden;
        }

        /* Glow effect in background */
        body::before {
            content: ""; position: absolute; width: 300px; height: 300px;
            background: #6366f1; filter: blur(150px); opacity: 0.2;
            top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: -1;
        }

        .card { 
            background: rgba(255, 255, 255, 0.03); 
            backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            border-radius: 32px; 
            padding: 40px; 
            width: 100%;
            max-width: 400px; 
            text-align: center; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .logo-box {
            width: 70px; height: 70px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            border-radius: 20px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
        }

        h2 { font-size: 28px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }

        .input-group { text-align: left; margin-bottom: 16px; }
        
        input { 
            width: 100%; 
            padding: 14px 16px; 
            border-radius: 14px; 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            background: rgba(255, 255, 255, 0.05); 
            color: white; 
            outline: none; 
            font-size: 15px;
            transition: all 0.3s ease;
        }

        input:focus { border-color: #6366f1; background: rgba(255, 255, 255, 0.1); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

        .btn { 
            width: 100%; 
            padding: 14px; 
            background: #6366f1; 
            border: none; 
            border-radius: 14px; 
            color: white; 
            font-weight: 600; 
            font-size: 16px;
            cursor: pointer; 
            margin-top: 10px;
            transition: all 0.3s ease;
        }

        .btn:hover { background: #4f46e5; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }

        .divider { 
            margin: 30px 0; 
            display: flex; 
            align-items: center; 
            color: #475569; 
            font-size: 12px; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.1); margin: 0 15px; }

        .social-group { display: flex; justify-content: center; gap: 16px; }

        .social-item { 
            width: 50px; height: 50px; 
            border-radius: 14px; 
            background: rgba(255, 255, 255, 0.05); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            color: white; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 20px;
            cursor: pointer; 
            transition: all 0.3s ease; 
        }

        .social-item:hover { 
            background: rgba(255, 255, 255, 0.1); 
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-3px);
        }

        .footer-text { margin-top: 30px; font-size: 13px; color: #94a3b8; }
        .footer-text span { color: #6366f1; cursor: pointer; font-weight: 600; }

    </style>
</head>
<body>

    <div class="card">
        <div class="logo-box">
            <i class="fas fa-satellite-dish"></i>
        </div>
        <h2>Welcome Back</h2>
        <p>Login to your StreamFlow account</p>
        
        <div class="input-group">
            <input type="email" id="email" placeholder="Email Address">
        </div>
        <div class="input-group">
            <input type="password" id="pass" placeholder="Password">
        </div>
        
        <button class="btn" onclick="handleAuth()">Sign In</button>

        <div class="divider">Or continue with</div>

        <div class="social-group">
            <div class="social-item"><i class="fab fa-google"></i></div>
            <div class="social-item"><i class="fab fa-facebook-f"></i></div>
            <div class="social-item"><i class="fab fa-apple"></i></div>
        </div>

        <div class="footer-text">
            Don't have an account? <span onclick="alert('Sign Up Page Coming Soon!')">Sign Up</span>
        </div>
    </div>

    <script>
        async function handleAuth() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('pass').value;
            
            if(!email || !password) {
                return alert("Bhai, pehle details toh bharo!");
            }

            try {
                const response = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                alert(data.message || data.error);
            } catch (err) {
                alert("Server Error! Check your connection.");
            }
        }
    </script>
</body>
</html>
