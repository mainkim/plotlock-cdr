# Installed agent skills

Synced into `.cursor/skills/` for Cursor Agent discovery.

## Sources

1. **addyosmani/agent-skills** — https://github.com/addyosmani/agent-skills  
2. **obra/superpowers** — https://github.com/obra/superpowers (folders prefixed `superpowers-`)  
3. **browser-harness** — https://github.com/browser-use/browser-harness  

## Refresh upstream

```bash
git clone --depth 1 https://github.com/addyosmani/agent-skills.git /tmp/agent-skills
git clone --depth 1 https://github.com/obra/superpowers.git /tmp/superpowers
git clone --depth 1 https://github.com/browser-use/browser-harness.git /tmp/browser-harness

cp -a /tmp/agent-skills/skills/. .cursor/skills/
# re-apply superpowers-* prefix copy as in the install commit
```

## Notes

- Name collision: both packs ship `test-driven-development`. Upstream addy keeps the short name; Superpowers is `superpowers-test-driven-development`.
- `browser-harness` needs the CLI + Chrome remote debugging on the machine running the agent.
