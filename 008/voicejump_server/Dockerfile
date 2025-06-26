FROM 10.0.0.11:8006/library/node:16.20.2

LABEL authors="yckj"

# 设置时区为北京时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /sunday/lianjin_game/voicejump

ADD . /sunday/lianjin_game/voicejump/

RUN npm install --verbose

EXPOSE 9007
#
ENTRYPOINT ["npm", "start"]
