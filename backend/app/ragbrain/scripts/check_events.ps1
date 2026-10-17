Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddMinutes(-30)} -ErrorAction SilentlyContinue |
    Where-Object { $_.ProviderName -like '*Docker*' -or $_.Message -like '*docker*' -or $_.LevelDisplayName -eq 'Error' } |
    Select-Object -First 15 |
    Format-List TimeCreated, ProviderName, LevelDisplayName, Message
