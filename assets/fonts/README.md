# 글꼴

`PokiiSansKR-*.otf`는 Pretendard 1.3.9(`npm pack pretendard@1.3.9`의 `dist/public/static/*.otf`)를
KS X 1001 한글 2,350자 + 한글 자모 + 라틴(U+0020–U+00FF) + 일부 문장부호로 서브셋한 것이다.
Pretendard는 OFL Reserved Font Name이 걸려 있어 수정본의 이름을 `Pokii Sans KR`로 바꿨다. 라이선스는 `PokiiSansKR-OFL.txt`.

다시 만들 때:

1. 글자 목록: EUC-KR `0xB0A1–0xC8FE`를 디코드한 한글 + `U+3131–U+3163` + `U+0020–U+00FF` + `‘’“”…·–—→←↑↓•※©`
2. `uvx --from fonttools pyftsubset <원본>.otf --text-file=<목록> --layout-features='*' --output-file=<출력>.otf`
3. name 테이블 1·4·6·16·17과 CFF FontName·FamilyName·FullName을 `Pokii Sans KR` / `PokiiSansKR-<굵기>`로 바꾼다
