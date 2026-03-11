using System;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

var http = new HttpClient();
http.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0");

var lrcBytes = await http.GetByteArrayAsync("https://lyric.nct.vn/2026/03/03/c/w/Z/u/1772512725317.lrc");
var lrcRaw = Encoding.UTF8.GetString(lrcBytes);
var hexClean = Regex.Replace(lrcRaw.Trim(), @"\s+", "");
Console.WriteLine($"Hex len: {hexClean.Length}, Is hex: {Regex.IsMatch(hexClean, @"^[0-9A-Fa-f]+$")}");

var encBytes = Enumerable.Range(0, hexClean.Length / 2)
    .Select(i => Convert.ToByte(hexClean.Substring(i * 2, 2), 16)).ToArray();
Console.WriteLine($"Enc: {encBytes.Length} bytes");

var decryptKey = "Lyr1cjust4nct";
var lrcRegex = new Regex(@"\[\d{2}:\d{2}\.\d{2,3}\]");

// Try DES variants
Console.WriteLine("=== Testing DES ===");
var desKey8 = Encoding.UTF8.GetBytes(decryptKey.PadRight(8, '\0'))[..8];
int desBlockLen = (encBytes.Length / 8) * 8;
var desAligned = encBytes.Take(desBlockLen).ToArray();
foreach (var mode in new[] { CipherMode.ECB, CipherMode.CBC })
{
    foreach (var pad in new[] { PaddingMode.None, PaddingMode.PKCS7, PaddingMode.Zeros })
    {
        try
        {
            using var des = DES.Create();
            des.Key = desKey8;
            des.Mode = mode;
            des.Padding = pad;
            des.IV = new byte[8];
            using var dec = des.CreateDecryptor();
            var db = dec.TransformFinalBlock(desAligned, 0, desAligned.Length);
            var txt = Encoding.UTF8.GetString(db).TrimEnd('\0');
            var matches = lrcRegex.Matches(txt).Count;
            if (matches >= 2)
            {
                Console.WriteLine($"DES SUCCESS! mode={mode} pad={pad} matches={matches}");
                Console.WriteLine(txt[..Math.Min(400, txt.Length)]);
                Environment.Exit(0);
            }
        }
        catch { }
    }
}

// Try TripleDES
Console.WriteLine("=== Testing TripleDES ===");
var tdesKey = Encoding.UTF8.GetBytes(decryptKey.PadRight(24, '\0'))[..24];
foreach (var mode in new[] { CipherMode.ECB, CipherMode.CBC })
{
    foreach (var pad in new[] { PaddingMode.None, PaddingMode.PKCS7, PaddingMode.Zeros })
    {
        try
        {
            using var tdes = TripleDES.Create();
            tdes.Key = tdesKey;
            tdes.Mode = mode;
            tdes.Padding = pad;
            tdes.IV = new byte[8];
            using var dec = tdes.CreateDecryptor();
            var db = dec.TransformFinalBlock(desAligned, 0, desAligned.Length);
            var txt = Encoding.UTF8.GetString(db).TrimEnd('\0');
            var matches = lrcRegex.Matches(txt).Count;
            if (matches >= 2)
            {
                Console.WriteLine($"3DES SUCCESS! mode={mode} pad={pad} matches={matches}");
                Console.WriteLine(txt[..Math.Min(400, txt.Length)]);
                Environment.Exit(0);
            }
        }
        catch { }
    }
}

// Try AES with more key variants  
Console.WriteLine("=== Testing AES with more keys ===");
var aesAligned = encBytes.Take((encBytes.Length / 16) * 16).ToArray();

// Try key as-is (13 bytes padded various ways)
var aesKeys = new (string name, byte[] key)[] {
    ("pad-null-16", Encoding.UTF8.GetBytes(decryptKey.PadRight(16, '\0'))[..16]),
    ("md5", MD5.HashData(Encoding.UTF8.GetBytes(decryptKey))),
    ("sha256-16", SHA256.HashData(Encoding.UTF8.GetBytes(decryptKey))[..16]),
    ("sha256-32", SHA256.HashData(Encoding.UTF8.GetBytes(decryptKey))),
    ("pad-space", Encoding.UTF8.GetBytes(decryptKey.PadRight(16))[..16]),
    ("repeat", Encoding.UTF8.GetBytes(decryptKey + decryptKey)[..16]),
};

foreach (var (kname, keyBytes) in aesKeys)
{
    var klen = keyBytes.Length;
    foreach (var mode in new[] { CipherMode.ECB, CipherMode.CBC })
    {
        foreach (var pad in new[] { PaddingMode.None, PaddingMode.PKCS7, PaddingMode.Zeros })
        {
            // With zero IV and first-block IV
            foreach (var ivType in new[] { "zero", "first" })
            {
                try
                {
                    using var aes = Aes.Create();
                    aes.Key = keyBytes;
                    aes.Mode = mode;
                    aes.Padding = pad;
                    byte[] input;
                    if (mode == CipherMode.CBC && ivType == "first")
                    {
                        aes.IV = aesAligned[..16];
                        input = aesAligned[16..];
                    }
                    else
                    {
                        aes.IV = new byte[16];
                        input = aesAligned;
                    }
                    using var dec = aes.CreateDecryptor();
                    var db = dec.TransformFinalBlock(input, 0, input.Length);
                    var txt = Encoding.UTF8.GetString(db).TrimEnd('\0');
                    var matches = lrcRegex.Matches(txt).Count;
                    if (matches >= 2)
                    {
                        Console.WriteLine($"AES SUCCESS! key={kname}({klen}B) mode={mode} pad={pad} iv={ivType} matches={matches}");
                        Console.WriteLine(txt[..Math.Min(400, txt.Length)]);
                        Environment.Exit(0);
                    }
                }
                catch { }
            }
        }
    }
}

Console.WriteLine("ALL FAILED - cannot decrypt NCT LRC");
