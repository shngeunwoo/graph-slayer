# 약점베기

공통수학 1·2 단원이 상대입니다. 결투 전과 처치 뒤에 **증강 셋 중 하나**를 고릅니다. 약점 식은 그래프 위 검은 칸에 나옵니다. 곡선 전체는 베기 전에 보이지 않고, 맞춘 점 주변만 열립니다. 선을 긋는 동안 밀착 게이지가 차며, 일섬이 되면 베기 버튼이 달아오릅니다. 빗나간 점은 취소할 수 있고, 베기 뒤에는 점이 남은 채로 다시 긋습니다. 좌표는 `1/2` 같은 분수도 받습니다. 빗나간 점 없이 연속으로 맞추면 콤보가 붙어 피해가 늘어납니다.

## 하는 법

1. 식만 보고 그래프를 클릭하거나 좌표를 입력합니다. 빗나간 점을 따라가면 패널티입니다.
2. 금화로 아이템을 삽니다. **x축 대칭, y축 대칭, 원점 대칭, y=x 대칭, 평행이동**.
3. 아이템을 사용하면 약점 그래프가 바뀝니다. 점을 다시 찍고 새 모양대로 그으세요.
4. 베기 — 검이 약점 선을 가르며 곡선이 드러납니다. 뒤쪽 상대는 변환해야 제대로 들어갑니다.

## 실행

```bash
npm install
npm run dev
```

[http://127.0.0.1:43127](http://127.0.0.1:43127)

## 배포

서재와 같이 GitHub Pages에 올립니다. `main`에 푸시하면 Actions가 `gh-pages` 브랜치로 배포합니다. 처음 한 번은 [Pages 설정](https://github.com/shngeunwoo/graph-slayer/settings/pages)에서 Source를 Deploy from a branch, 브랜치를 `gh-pages`, 폴더를 `/` 로 저장합니다.

- 저장소: https://github.com/shngeunwoo/graph-slayer
- 사이트: https://shngeunwoo.github.io/graph-slayer/

로컬에서 같은 정적 빌드를 확인하려면 `GITHUB_PAGES=true npm run build` 입니다.
