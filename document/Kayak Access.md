# Kayak Access

# Deeplink

## Example

- One way deeplink
    
    ```html
    https://www.skywingtrip.com/transferad?landingPage=list&locale=TW&mktportal=kayak&language=tc&currency=CNY&deepLinkTokenId=20230520V1&campaign=flight&tripType=OW&cabinType=E&departCity=SHA&arriveCity=TYO&departTime=20230528&returnTime=&adult=1&children=1&infant=1
    ```
    
- Round trip deeplink
    
    ```json
    https://www.skywingtrip.com/transferad?landingPage=list&locale=TW&mktportal=kayak&language=tc&currency=CNY&deepLinkTokenId=20230520V1&campaign=flight&tripType=RT&cabinType=E&departCity=SHA&arriveCity=TYO&departTime=20230528&returnTime=20230530&adult=1&children=1&infant=1
    ```
    

## Parameters Description

| Parameters | Possible Values |
| --- | --- |
| landingPage | list |
| locale | kayak local site |
| mktportal | kayak |
| language | en/cn/tc |
| currency | HKD/USD/CNY/TWD/MYR/EUR |
| deepLinkTokenId | 20230520V1 |
| campaign | flight |
| tripType | OW (one way) / RT (round trip) |
| cabinType | E (Economy & Premium) / B (Business & First) |
| departCity | City Code & IATA Code |
| arriveCity | City Code & IATA Code |
| departTime | yyyymmdd |
| returnTime | yyyymmdd |
| adult | adult count |
| children | children count |
| infant | infant count |