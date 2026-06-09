import { parseHTML } from 'linkedom';
import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';
import emailTextTemplate from '../template/email-text';

function escapeHtml(value = '') {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function stripScripts(content) {
	const { document } = parseHTML(content || '');
	document.querySelectorAll('script').forEach(script => script.remove());
	return document.toString();
}

function isFullHtmlDocument(content) {
	return /<!doctype html/i.test(content || '') || /<html[\s>]/i.test(content || '');
}

function wrapHtmlFragment(content) {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		html, body {
			margin: 0;
			padding: 0;
			background: #fff;
		}

		body {
			box-sizing: border-box;
			padding: 12px;
			font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			color: #1f2937;
		}

		img {
			max-width: 100%;
			height: auto;
		}
	</style>
</head>
<body>${content}</body>
</html>`;
}

function noUnreadPage(accountEmail) {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>没有新邮件</title>
	<style>
		body {
			margin: 0;
			font-family: Arial, "Microsoft YaHei", sans-serif;
			color: #1f2937;
			background: #fff;
		}

		.page {
			max-width: 960px;
			margin: 0 auto;
			padding: 28px 20px;
		}

		h1 {
			margin: 0 0 14px;
			font-size: 28px;
		}

		p {
			margin: 0;
			color: #4b5563;
			font-size: 15px;
		}
	</style>
</head>
<body>
	<div class="page">
		<h1>没有新邮件</h1>
		<p>${escapeHtml(accountEmail)} 当前没有未读邮件。</p>
	</div>
</body>
</html>`;
}

function headerPage(email, accountEmail, bodyHtml) {
	const fromName = email.sendName ? `${escapeHtml(email.sendName)} ` : '';
	const fromEmail = email.sendEmail ? `&lt;${escapeHtml(email.sendEmail)}&gt;` : '';

	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(email.subject || '邮件内容')}</title>
	<style>
		html, body {
			margin: 0;
			padding: 0;
			background: #fff;
		}

		body {
			font-family: Arial, "Microsoft YaHei", sans-serif;
			color: #1f2937;
		}

		.page {
			max-width: 1240px;
			margin: 0 auto;
			padding: 14px 20px 0;
		}

		h1 {
			margin: 0 0 10px;
			font-size: 22px;
			line-height: 1.35;
			font-weight: 700;
		}

		.meta {
			font-size: 14px;
			color: #374151;
		}

		.meta-row {
			margin: 6px 0;
		}

		.meta-label {
			display: inline-block;
			min-width: 52px;
			font-weight: 700;
			color: #111827;
		}

		.rule {
			height: 1px;
			background: #e5e7eb;
			margin: 14px 0 0;
		}

		.mail-body {
			width: 100%;
			border: 0;
			display: block;
			background: #fff;
		}
	</style>
</head>
<body>
	<div class="page">
		<h1>${escapeHtml(email.subject || '邮件内容')}</h1>
		<div class="meta">
			<div class="meta-row"><span class="meta-label">发件人</span>${fromName}${fromEmail}</div>
			<div class="meta-row"><span class="meta-label">收件人</span>${escapeHtml(accountEmail)}</div>
			<div class="meta-row">${escapeHtml(email.createTime || '')}</div>
		</div>
		<div class="rule"></div>
	</div>
	<iframe
		class="mail-body"
		sandbox="allow-same-origin"
		referrerpolicy="no-referrer"
		srcdoc="${escapeHtml(bodyHtml)}"
		onload="(function(frame){try{const doc=frame.contentDocument||frame.contentWindow.document;if(!doc)return;const bodyHeight=doc.body?doc.body.scrollHeight:0;const docHeight=doc.documentElement?doc.documentElement.scrollHeight:0;frame.style.height=Math.max(bodyHeight,docHeight,760)+'px';}catch(e){}})(this)"
	></iframe>
</body>
</html>`;
}

function renderEmailBody(content) {
	const sanitized = stripScripts(content);
	if (isFullHtmlDocument(content)) {
		return sanitized;
	}
	return wrapHtmlFragment(sanitized);
}

app.post('/public/genToken', async (c) => {
	const data = await publicService.genToken(c, await c.req.json());
	return c.json(result.ok(data));
});

app.post('/public/emailList', async (c) => {
	const list = await publicService.emailList(c, await c.req.json());
	return c.json(result.ok(list));
});

app.post('/public/addUser', async (c) => {
	await publicService.addUser(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/public/latest', async (c) => {
	const data = await publicService.latestBySid(c, c.req.query());
	const account = data.account;
	const email = data.email;

	if (!email) {
		return c.html(noUnreadPage(account.email));
	}

	if (email.content) {
		return c.html(headerPage(email, account.email, renderEmailBody(email.content)));
	}

	return c.html(emailTextTemplate(email.text || '没有可显示的邮件内容。'));
});
