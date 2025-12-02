this is intended to be documentation and a prompt for what this lunch app does.

the idea is borrowing from a shared one for this monorepo: users join a "room" together using sockets and then can interact on a common thing together. In this case its a ranked choice voting app where people can propose a lunch place to go to and vote on existing proposals. all the users can vote once but they can change their vote up until it times out.

I dont remember what starts the count down, whether its on the first poroposal or at the start of creating the room but after 20 minutes the top choice is decided for the group.

At this point everyone's screen should just show the places that has been decided for lunch so they can coordinate around that.

this works fine locally but doesn't work in the deployed app at antigogglin.org anymore. why do we think that is?

error on home page:
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015. (Reason: CORS request did not succeed). Status code: (null).

error on lunch page:
Socket connection error: Error: websocket error
    gL https://antigogglin.org/assets/index-aSgp_4Df.js:166
    onError https://antigogglin.org/assets/index-aSgp_4Df.js:166
    onerror https://antigogglin.org/assets/index-aSgp_4Df.js:166
    addEventListeners https://antigogglin.org/assets/index-aSgp_4Df.js:166
