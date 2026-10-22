php -v
'nest-server/src/claimjumpers' (see below for file content)
crenshawbarelywater@Crenshaws-Air b-mono % curl -X GET "http://localhost:4171/api/claimjumpers" -H "Accept: application/json"
{"message":"Cannot GET /api/claimjumpers","error":"Not Found","statusCode":404}%  
crenshawbarelywater@Crenshaws-Air b-mono % curl -X GET "http://localhost:4171/api/claimjumpers" -H "Accept: application/json"
{"message":"Cannot GET /api/claimjumpers","error":"Not Found","statusCode":404}%  
crenshawbarelywater@Crenshaws-Air b-mono %

how can I actually get a response form this endpoint?

<file_content path="nest-server/src/claimjumpers">
├── claimjumpers.controler.ts
├── claimjumpers.module.ts
└── claimjumpers.service.ts

<file_content path="nest-server/src/claimjumpers/claimjumpers.controler.ts">
