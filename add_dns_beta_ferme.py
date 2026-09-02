import ovh
import sys

try:
    client = ovh.Client(
        endpoint='ovh-eu',
        application_key='4fc9bc1256ca2d4a',
        application_secret='928bca67ee70b6595709fcca70787abf',
        consumer_key='dbbb8b0d12413786d739b44912c27ffb'
    )

    print("Authenticating with OVH API...")
    
    SUBDOMAIN = 'beta.ferme.bzh.dev'
    ZONE = 'icam.school'
    TARGET = '51.91.138.228'

    print(f"Adding/Updating record A for {SUBDOMAIN}.{ZONE} -> {TARGET}")

    existing_records = client.get(
        f'/domain/zone/{ZONE}/record', 
        fieldType='A', 
        subDomain=SUBDOMAIN
    )
    
    if existing_records:
        print(f"Record(s) already exist: {existing_records}. Updating...")
        for record_id in existing_records:
            result = client.put(
                f'/domain/zone/{ZONE}/record/{record_id}',
                target=TARGET,
                ttl=60
            )
            print("Record updated:", result)
    else:
        result = client.post(
            f'/domain/zone/{ZONE}/record',
            fieldType='A',
            subDomain=SUBDOMAIN,
            target=TARGET,
            ttl=60
        )
        print("Record created successfully:", result)

    print("Refreshing DNS zone...")
    client.post(f'/domain/zone/{ZONE}/refresh')
    print(f"✅ Zone '{ZONE}' refreshed successfully! {SUBDOMAIN}.{ZONE} is active.")

except Exception as e:
    print(f"❌ Error with OVH API: {e}")
    sys.exit(1)
