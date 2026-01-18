function getBaseTemplate(content: string) {
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
            padding: 30px;
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
    </style>
</head>
<body>
    <center class="wrapper">
        <table class="main" width="100%">
            <tr>
                <td style="padding: 40px 0 20px 0; text-align: center;">
                    <a href="https://aviprep.com.au" target="_blank">
                        <img src="https://aviprep.com.au/img/email/logo.png" alt="AviPrep Logo" width="180" style="display: block; margin: 0 auto;">
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
                    <p><strong>AviPrep</strong></p>
                    <p>© 2026 AviPrep. All rights reserved.</p>
                    
                    <div class="social-links">
                        <a href="https://x.com/AviPrep_AU">X</a> | 
                        <a href="https://instagram.com/AviPrep_AU">Instagram</a> |
                        <a href="https://linkedin.com/company/AviPrep>LinkedIn</a>
                    </div>

                    <p style="margin-top: 20px;">
                        You’re receiving this email because you signed up to the AviPrep waitlist.
                    </p>
                    <p>
                        <a href="https://aviprep.com.au/dashboard/settings">Unsubscribe</a>
                    </p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
  `
}

export function getCustomTemplate(htmlContent: string) {
    // If the content already has full HTML structure, return as-is
    if (htmlContent.toLowerCase().includes("<!doctype") || htmlContent.toLowerCase().includes("<html")) {
        return htmlContent
    }
    // Otherwise wrap in base template
    return getBaseTemplate(htmlContent)
}