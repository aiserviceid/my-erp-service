Add-Type -AssemblyName System.Drawing

$sourcePath = 'd:\data ipud\aiservice beckup\TRACKING SERVICE\public\unitpro-mark.png'
$resDir = 'd:\data ipud\aiservice beckup\TRACKING SERVICE\android\app\src\main\res'

$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

$configs = @(
    @{ dir = 'mipmap-mdpi'; icon = 48; fg = 108 },
    @{ dir = 'mipmap-hdpi'; icon = 72; fg = 162 },
    @{ dir = 'mipmap-xhdpi'; icon = 96; fg = 216 },
    @{ dir = 'mipmap-xxhdpi'; icon = 144; fg = 288 },
    @{ dir = 'mipmap-xxxhdpi'; icon = 192; fg = 384 }
)

foreach ($cfg in $configs) {
    $targetFolder = Join-Path $resDir $cfg.dir
    if (-not (Test-Path $targetFolder)) {
        New-Item -ItemType Directory -Path $targetFolder | Out-Null
    }

    # Generate ic_launcher.png & ic_launcher_round.png
    $bmpIcon = New-Object System.Drawing.Bitmap([int]$cfg.icon, [int]$cfg.icon)
    $gIcon = [System.Drawing.Graphics]::FromImage($bmpIcon)
    $gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gIcon.DrawImage($srcImg, 0, 0, [int]$cfg.icon, [int]$cfg.icon)
    $gIcon.Dispose()

    $iconPath = Join-Path $targetFolder 'ic_launcher.png'
    $roundPath = Join-Path $targetFolder 'ic_launcher_round.png'
    $bmpIcon.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpIcon.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpIcon.Dispose()

    # Generate ic_launcher_foreground.png
    $fgSize = [int]$cfg.fg
    $bmpFg = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $padding = [int]($fgSize * 0.15)
    $innerSize = $fgSize - ($padding * 2)
    $gFg.DrawImage($srcImg, $padding, $padding, $innerSize, $innerSize)
    $gFg.Dispose()

    $fgPath = Join-Path $targetFolder 'ic_launcher_foreground.png'
    $bmpFg.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()
    
    Write-Host "Generated icons for $($cfg.dir)"
}

$srcImg.Dispose()
Write-Host "All Android icons generated successfully!"
