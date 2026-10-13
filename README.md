# rendsmedia-site

Source for www.rendsmedia.com — a custom-coded three-page site (Home, Portfolio, Contact).

## Layout

- `site/` — everything that gets published. Only this folder is copied to the server.
- `.cpanel.yml` — deployment instructions for cPanel Git Version Control.

## Deploying

1. In cPanel → Git™ Version Control → Manage → Pull or Deploy.
2. Click **Update from Remote**, then **Deploy HEAD Commit**.

Staging target: `/home/rends/public_html/new.rendsmedia.com/` (new.rendsmedia.com).
At launch, `DEPLOYPATH` in `.cpanel.yml` changes to `/home/rends/public_html/` and `site/robots.txt` is replaced so search engines can index the site.
