FROM 10.0.0.11:8006/library/node:16.20.2

LABEL authors="yckj"

# 设置时区为北京时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /sunday/lianjin_game/game-update

ADD . /sunday/lianjin_game/game-update/

RUN mkdir -p /sunday/lianjin_game/game-update/game-wzq

RUN mkdir -p /sunday/lianjin_game/game-update/game-hlddz

RUN mkdir -p /sunday/lianjin_game/game-update/game-uno

RUN mkdir -p /sunday/lianjin_game/game-update/game-zgxq

RUN mkdir -p /sunday/lianjin_game/game-update/game-fxq

RUN mkdir -p /sunday/lianjin_game/game-update/game-voicejump

RUN npm install --verbose

EXPOSE 3000
#
ENTRYPOINT ["npm", "start"]
