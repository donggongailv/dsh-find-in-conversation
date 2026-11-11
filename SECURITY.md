# Security

`dsh-find-in-conversation` is a client-only UI bundle. It does not send data over
the network, register agent tools, append session events, or persist search
queries.

It reads rendered conversation text to build search ranges and uses the CSS
Custom Highlight API to paint them. Search results are transient and disappear
when the find bar closes or the plugin unloads.

If you find a security issue, please open a
[private security advisory](https://github.com/donggongailv/dsh-find-in-conversation/security/advisories/new)
rather than a public issue. Include the DeepSeek Harness version, the browser
platform, and the shortest reproduction you can provide.
