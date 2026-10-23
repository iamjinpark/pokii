# 글꼴

`Paperlogy-*.ttf`는 페이퍼로지 1.001(https://github.com/Freesentation/paperlogy 의 `Paperlogy-1.001.zip`,
`4Regular`·`7Bold`)을 KS X 1001 한글 2,350자 + 한글 자모 + 라틴(U+0020–U+00FF) + 일부 문장부호로 서브셋한 것이다.
OFL이고 Reserved Font Name이 없어 이름은 그대로 둔다. 라이선스는 `Paperlogy-OFL.txt`.

다시 만들 때:

1. 글자 목록: EUC-KR `0xB0A1–0xC8FE`를 디코드한 한글 + `U+3131–U+3163` + `U+0020–U+00FF` + `‘’“”…·–—→←↑↓•※©`
2. `uvx --from fonttools pyftsubset <원본>.ttf --text-file=<목록> --layout-features='*' --output-file=<출력>.ttf`
