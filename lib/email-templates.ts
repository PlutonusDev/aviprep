function getBaseTemplate(content: string, userEmail: string) {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AviPrep Update</title>
    <style>
        /* Basic reset for email clients */
        body {
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #f9f9f9;
            color: #333333;
        }
        table {
            border-spacing: 0;
            width: 100%;
        }
        td {
            padding: 0;
        }
        img {
            border: 0;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f9f9f9;
            padding-top: 40px;
            padding-bottom: 40px;
        }
        .main {
            background-color: #ffffff;
            margin: 0 auto;
            width: 100%;
            max-width: 600px;
            border-spacing: 0;
        }
        .content {
            padding: 30px 30px 10px 30px;
            line-height: 1.6;
            font-size: 16px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #777777;
            padding: 20px;
        }
        .footer a {
            color: #007bff;
            text-decoration: none;
        }
        .social-links {
            margin: 10px 0;
        }
        h1 { color: #1a1a1a; font-size: 24px; margin-top: 0; }
        .feature-title { font-weight: bold; color: #1a1a1a; margin-bottom: 2px; display: block; }
        .feature-desc { margin-top: 0; margin-bottom: 15px; }
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr>
                <td style="padding: 40px 0 20px 0; text-align: center;">
                    <a href="https://aviprep.com.au" target="_blank">
                        <img src="https://aviprep.com.au/email/logo.png" alt="AviPrep Logo" width="180" style="display: block; margin: 0 auto;">
                    </a>
                </td>
            </tr>

            <tr>
                <td class="content">
                    ${content}
                </td>
            </tr>

            <tr>
                <td class="footer">
                    <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
                    <h2><strong>AviPrep</strong></h2>
                    <p>© 2026 AviPrep. All rights reserved.</p>
                    
                    <div class="social-links">
                        <a href="https://x.com/AviPrep_AU">X</a> | 
                        <a href="https://instagram.com/AviPrep_AU">Instagram</a> |
                        <a href="https://linkedin.com/company/AviPrep">LinkedIn</a>
                    </div>

                    <p style="margin-top: 20px;">
                        You’re receiving this email because you signed up to the AviPrep waitlist.
                    </p>
                    <p>
                        <a href="https://aviprep.com.au/unsubscribe?email=${encodeURIComponent(userEmail)}">Unsubscribe</a>
                    </p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
  `
}

export function getWaitlistTemplate(userEmail: string) {
    return getBaseTemplate(`
        <h1>Welcome to the crew.</h1>
        <p>You're officially on the waitlist for AviPrep, and we've noted your email for your <strong>20% lifetime discount</strong> when we go live April 7th.</p>
        
        <p>We're building the theory resource we wish we had when we started training - something comprehensive, broken down into easy-to-understand concepts to get us into the cockpit sooner.</p>
        
        <img src="https://aviprep.com.au/email/separator.png" alt="Horizontal separator" width="180" style="display: block; margin: 0 auto;">

        <p><strong>What you can expect at launch:</strong></p>
        
        <span class="feature-title">Comprehensive Coverage</span>
        <p class="feature-desc">From RPL and PPL to CPL subjects, plus IREX and ATPL support in the future.</p>

        <span class="feature-title">Real Practice</span>
        <p class="feature-desc">Interactive exams designed to mirror the real thing.</p>

        <span class="feature-title">Community Support</span>
        <p class="feature-desc">A dedicated forum to connect with other Aussie pilots.</p>

        <span class="feature-title">Zero Fluff</span>
        <p class="feature-desc">Explanations that actually make sense, designed to help you clear those KDRs.</p>

        <img src="https://aviprep.com.au/email/separator.png" alt="Horizontal separator" width="180" style="display: block; margin: 0 auto;">
        
        <p>We'll be reaching out to you as we get closer to launch day with your exclusive early access link. In the meantime, feel free to follow our journey on our socials below for study tips and progress updates.</p>
        
        <p>Clear skies,<br><strong>The AviPrep team</strong></p>
    `, userEmail)
}

export function getCustomTemplate(htmlContent: string, userEmail: string) {
    // If the content already has full HTML structure, return as-is
    if (htmlContent.toLowerCase().includes("<!doctype") || htmlContent.toLowerCase().includes("<html")) {
        return htmlContent
    }
    // Otherwise wrap in base template
    return getBaseTemplate(htmlContent, userEmail)
}