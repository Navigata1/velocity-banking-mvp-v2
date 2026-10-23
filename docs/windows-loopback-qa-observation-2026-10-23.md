# Windows Loopback QA Observation

The first direct-evaluation proposal's local29-stage run stopped at Portfolio's
unchanged common-month smoke after12 passed stages. Chrome emitted
`Failed to load resource: net::ERR_NO_BUFFER_SPACE`; the failed request URL was
not recorded. The run remains FAILED, with no inherited complete-suite approval.
All13 owned stage jobs closed;485 source inputs and221 isolated web copies were
unchanged at post-failure readback. The original preview/build stayed intact.

A later host snapshot showed available physical memory and low TCP counts.
It was not taken at the failing request and cannot exclude transient pressure.
Chromium maps Winsock `WSAENOBUFS` to this error; its current Windows tracker
contains a similar loopback report. That is a lead, not a local diagnosis.
[Chromium mapping](https://chromium.googlesource.com/chromium/src/net/+/master/base/net_errors_win.cc),
[Reported loopback issue](https://issuetracker.google.com/issues/572515601).

One bounded synthetic collection completed325 default-variant navigations with
zero observed resource errors, then stopped at its declared64MiB NetLog limit.
The other three planned variants never ran. This is not a completed comparison
or a demonstrated workaround. An earlier command-line-attestation setup failure
made zero HTTP requests and is retained separately. All owned probe contexts,
browsers/server and native jobs closed; existing user browsers were untouched.

No browser-feature workaround, OS/network change, error filter, test retry or
acceptance-budget change was adopted. The later independently reviewed UI truth
correction is a separate source change, not a claimed fix for this network error.
Its combined fresh486-source gate run must start from scratch, with all failures
retained and both exact-head CI events/hosted checks still required.
