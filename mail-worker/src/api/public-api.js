import app from '../hono/hono';
import result from '../model/result';
import publicService from '../service/public-service';
import { html } from 'hono/html';

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
		return c.html(html`<!doctype html>
			<html>
				<head>
					<meta charset="utf-8" />
					<title>No mail yet</title>
				</head>
				<body>
					<h1>No mail yet</h1>
					<p>${account.email} has no received mail.</p>
				</body>
			</html>`);
	}

	return c.html(html`<!doctype html>
		<html>
			<head>
				<meta charset="utf-8" />
				<title>${email.subject || '(no subject)'}</title>
				<style>
					body { font-family: Arial, "Microsoft YaHei", sans-serif; max-width: 960px; margin: 32px auto; line-height: 1.6; }
					.meta { color: #555; border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 20px; }
					pre { white-space: pre-wrap; word-break: break-word; background: #f7f7f7; padding: 16px; border-radius: 6px; }
				</style>
			</head>
			<body>
				<h1>${email.subject || '(no subject)'}</h1>
				<div class="meta">
					<div><b>To:</b> ${account.email}</div>
					<div><b>From:</b> ${email.sendName || ''} &lt;${email.sendEmail || ''}&gt;</div>
					<div><b>Time:</b> ${email.createTime || ''}</div>
					<div><b>Code:</b> ${email.code || ''}</div>
				</div>
				<h2>Text</h2>
				<pre>${email.text || ''}</pre>
				<h2>HTML Source</h2>
				<pre>${email.content || ''}</pre>
			</body>
		</html>`);
});
